import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { parseDateToUTC, formatDateToYYYYMMDD } from "../lib/dates.js";
import { sendError } from "../lib/errors.js";

const completionsSchema = z.array(
  z.object({
    habitId: z.string().uuid(),
    done: z.boolean(),
  })
);

const postCheckinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  mood: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  completions: completionsSchema.optional(),
});

export async function checkinsRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post(
    "/checkins",
    {
      schema: {
        description: "Create or update daily check-in",
        tags: ["checkins"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["date"],
          properties: {
            date: { type: "string", format: "date" },
            mood: { type: "number", minimum: 1, maximum: 5 },
            notes: { type: "string" },
            completions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  habitId: { type: "string" },
                  done: { type: "boolean" },
                },
                required: ["habitId", "done"],
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              date: { type: "string" },
              mood: { type: "number" },
              notes: { type: "string" },
              completions: { type: "array" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const parsed = postCheckinSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          parsed.error.flatten()
        );
      }

      const { date: dateStr, mood, notes, completions } = parsed.data;
      const dateUTC = parseDateToUTC(dateStr);
      const userId = payload.sub;

      if (mood !== undefined) {
        await fastify.prisma.moodEntry.upsert({
          where: {
            userId_date: { userId, date: dateUTC },
          },
          create: { userId, date: dateUTC, mood, notes },
          update: { mood, notes },
        });
      } else if (notes !== undefined) {
        const existing = await fastify.prisma.moodEntry.findUnique({
          where: { userId_date: { userId, date: dateUTC } },
        });
        if (existing) {
          await fastify.prisma.moodEntry.update({
            where: { id: existing.id },
            data: { notes },
          });
        }
      }

      if (completions?.length) {
        for (const { habitId, done } of completions) {
          const habit = await fastify.prisma.habit.findFirst({
            where: { id: habitId, userId },
          });
          if (!habit) continue;

          if (done) {
            await fastify.prisma.habitCompletion.upsert({
              where: {
                userId_habitId_date: { userId, habitId, date: dateUTC },
              },
              create: { userId, habitId, date: dateUTC, done: true },
              update: { done: true },
            });
          } else {
            await fastify.prisma.habitCompletion.deleteMany({
              where: { userId, habitId, date: dateUTC },
            });
          }
        }
      }

      const moodEntry = await fastify.prisma.moodEntry.findUnique({
        where: { userId_date: { userId, date: dateUTC } },
      });
      const habitCompletions = await fastify.prisma.habitCompletion.findMany({
        where: { userId, date: dateUTC },
        select: { habitId: true, done: true },
      });

      return reply.send({
        date: dateStr,
        mood: moodEntry?.mood,
        notes: moodEntry?.notes ?? undefined,
        completions: habitCompletions.map((c) => ({ habitId: c.habitId, done: c.done })),
      });
    }
  );

  fastify.get(
    "/checkins/:date",
    {
      schema: {
        description: "Get check-in for a date",
        tags: ["checkins"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { date: { type: "string", format: "date" } },
          required: ["date"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              date: { type: "string" },
              mood: { type: "number" },
              notes: { type: "string" },
              completions: { type: "array" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { date: string } }>, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const { date: dateStr } = request.params;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return sendError(reply, 400, "VALIDATION_ERROR", "Date must be YYYY-MM-DD");
      }

      const dateUTC = parseDateToUTC(dateStr);
      const userId = payload.sub;

      const [moodEntry, habitCompletions] = await Promise.all([
        fastify.prisma.moodEntry.findUnique({
          where: { userId_date: { userId, date: dateUTC } },
        }),
        fastify.prisma.habitCompletion.findMany({
          where: { userId, date: dateUTC },
          select: { habitId: true, done: true },
        }),
      ]);

      return reply.send({
        date: dateStr,
        mood: moodEntry?.mood,
        notes: moodEntry?.notes ?? undefined,
        completions: habitCompletions.map((c) => ({ habitId: c.habitId, done: c.done })),
      });
    }
  );
}
