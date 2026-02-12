import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { parseDateToUTC, daysBetween, formatDateToYYYYMMDD } from "../lib/dates.js";
import { sendError } from "../lib/errors.js";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function insightsRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get(
    "/insights/summary",
    {
      schema: {
        description: "Get insights summary for date range",
        tags: ["insights"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          required: ["from", "to"],
          properties: {
            from: { type: "string", format: "date" },
            to: { type: "string", format: "date" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              avgMood: { type: ["number", "null"] },
              completionPercent: { type: "number" },
              habits: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    habitId: { type: "string" },
                    name: { type: "string" },
                    color: { type: ["string", "null"] },
                    completionCount: { type: "number" },
                    completionRate: { type: "number" },
                    currentStreak: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const parsed = querySchema.safeParse(request.query);

      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "from and to must be YYYY-MM-DD",
          parsed.error.flatten()
        );
      }

      const { from: fromStr, to: toStr } = parsed.data;
      const fromDate = parseDateToUTC(fromStr);
      const toDate = parseDateToUTC(toStr);

      if (fromDate > toDate) {
        return sendError(reply, 400, "VALIDATION_ERROR", "from must be before or equal to to");
      }

      const userId = payload.sub;
      const daysInRange = daysBetween(fromDate, toDate);
      const referenceDate = toDate > new Date() ? new Date() : toDate;

      const habits = await fastify.prisma.habit.findMany({
        where: { userId, isArchived: false },
        select: { id: true, name: true, color: true },
      });

      const habitSummaries = await Promise.all(
        habits.map(async (habit) => {
          const completions = await fastify.prisma.habitCompletion.findMany({
            where: {
              userId,
              habitId: habit.id,
              date: { gte: fromDate, lte: toDate },
              done: true,
            },
            select: { date: true },
          });

          const completionCount = completions.length;
          const completionDates = new Set(
            completions.map((c) => formatDateToYYYYMMDD(c.date))
          );

          let currentStreak = 0;
          const checkDate = new Date(referenceDate);
          checkDate.setUTCHours(0, 0, 0, 0);

          while (checkDate >= fromDate) {
            const d = formatDateToYYYYMMDD(checkDate);
            if (completionDates.has(d)) {
              currentStreak++;
              checkDate.setUTCDate(checkDate.getUTCDate() - 1);
            } else {
              break;
            }
          }

          return {
            id: habit.id,
            habitId: habit.id,
            name: habit.name,
            color: habit.color,
            completionCount,
            completionRate: daysInRange > 0 ? completionCount / daysInRange : 0,
            currentStreak,
          };
        })
      );

      const moodEntries = await fastify.prisma.moodEntry.findMany({
        where: {
          userId,
          date: { gte: fromDate, lte: toDate },
        },
        select: { mood: true },
      });

      const avgMood =
        moodEntries.length > 0
          ? moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length
          : null;

      const totalCompletions = habitSummaries.reduce((s, h) => s + h.completionCount, 0);
      const totalPossible =
        habits.length > 0 && daysInRange > 0 ? habits.length * daysInRange : 1;
      const completionPercent =
        totalPossible > 0
          ? Math.min(100, (totalCompletions / totalPossible) * 100)
          : 0;

      return reply.send({
        from: fromStr,
        to: toStr,
        avgMood: avgMood !== null ? Math.round(avgMood * 100) / 100 : null,
        completionPercent,
        habits: habitSummaries,
      });
    }
  );
}
