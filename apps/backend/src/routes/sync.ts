import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { parseDateToUTC } from "../lib/dates.js";
import { sendError } from "../lib/errors.js";

const completionSetSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  habitId: z.string().uuid(),
  done: z.boolean(),
});

const moodSetSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(5),
  notes: z.string().optional(),
});

const habitCreateSchema = z.object({
  clientHabitId: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().optional(),
});

const habitUpdateSchema = z.object({
  habitId: z.string().uuid(),
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  isArchived: z.boolean().optional(),
});

const opSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["completion.set", "mood.set", "habit.create", "habit.update"]),
  payload: z.unknown(),
  createdAt: z.string().optional(),
});

const syncBodySchema = z.object({
  ops: z.array(opSchema),
});

type SyncResult = {
  applied: string[];
  skipped: string[];
  failed: Array<{ opId: string; code: string; message: string }>;
};

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post(
    "/sync",
    {
      schema: {
        description: "Batch sync operations (idempotent)",
        tags: ["sync"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["ops"],
          properties: {
            ops: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "type", "payload"],
                properties: {
                  id: { type: "string", format: "uuid" },
                  type: { type: "string", enum: ["completion.set", "mood.set", "habit.create", "habit.update"] },
                  payload: { type: "object" },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              applied: { type: "array", items: { type: "string" } },
              skipped: { type: "array", items: { type: "string" } },
              failed: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    opId: { type: "string" },
                    code: { type: "string" },
                    message: { type: "string" },
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
      const userId = payload.sub;

      const parsed = syncBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          parsed.error.flatten()
        );
      }

      const result: SyncResult = { applied: [], skipped: [], failed: [] };

      for (const op of parsed.data.ops) {
        const existing = await fastify.prisma.syncOp.findUnique({
          where: { userId_opId: { userId, opId: op.id } },
        });

        if (existing) {
          result.skipped.push(op.id);
          continue;
        }

        try {
          if (op.type === "completion.set") {
            const parsedPayload = completionSetSchema.safeParse(op.payload);
            if (!parsedPayload.success) {
              result.failed.push({
                opId: op.id,
                code: "INVALID_PAYLOAD",
                message: parsedPayload.error.message,
              });
              continue;
            }
            const { date, habitId, done } = parsedPayload.data;
            const dateUTC = parseDateToUTC(date);

            const habit = await fastify.prisma.habit.findFirst({
              where: { id: habitId, userId },
            });
            if (!habit) {
              result.failed.push({
                opId: op.id,
                code: "HABIT_NOT_FOUND",
                message: `Habit ${habitId} not found`,
              });
              continue;
            }

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
          } else if (op.type === "mood.set") {
            const parsedPayload = moodSetSchema.safeParse(op.payload);
            if (!parsedPayload.success) {
              result.failed.push({
                opId: op.id,
                code: "INVALID_PAYLOAD",
                message: parsedPayload.error.message,
              });
              continue;
            }
            const { date, mood, notes } = parsedPayload.data;
            const dateUTC = parseDateToUTC(date);

            await fastify.prisma.moodEntry.upsert({
              where: { userId_date: { userId, date: dateUTC } },
              create: { userId, date: dateUTC, mood, notes },
              update: { mood, notes },
            });
          } else if (op.type === "habit.create") {
            const parsedPayload = habitCreateSchema.safeParse(op.payload);
            if (!parsedPayload.success) {
              result.failed.push({
                opId: op.id,
                code: "INVALID_PAYLOAD",
                message: parsedPayload.error.message,
              });
              continue;
            }
            const { clientHabitId, name, color } = parsedPayload.data;
            const existing = await fastify.prisma.habit.findFirst({
              where: { id: clientHabitId, userId },
            });
            if (existing) {
              await fastify.prisma.syncOp.create({
                data: { userId, opId: op.id },
              });
              result.applied.push(op.id);
              continue;
            }
            await fastify.prisma.habit.create({
              data: { id: clientHabitId, userId, name, color: color ?? null },
            });
          } else if (op.type === "habit.update") {
            const parsedPayload = habitUpdateSchema.safeParse(op.payload);
            if (!parsedPayload.success) {
              result.failed.push({
                opId: op.id,
                code: "INVALID_PAYLOAD",
                message: parsedPayload.error.message,
              });
              continue;
            }
            const { habitId, name, color, isArchived } = parsedPayload.data;
            const existing = await fastify.prisma.habit.findFirst({
              where: { id: habitId, userId },
            });
            if (!existing) {
              result.failed.push({
                opId: op.id,
                code: "HABIT_NOT_FOUND",
                message: `Habit ${habitId} not found`,
              });
              continue;
            }
            const updateData: { name?: string; color?: string | null; isArchived?: boolean } = {};
            if (name !== undefined) updateData.name = name;
            if (color !== undefined) updateData.color = color;
            if (isArchived !== undefined) updateData.isArchived = isArchived;
            if (Object.keys(updateData).length > 0) {
              await fastify.prisma.habit.update({
                where: { id: habitId },
                data: updateData,
              });
            }
          } else {
            result.failed.push({
              opId: op.id,
              code: "UNKNOWN_OP_TYPE",
              message: `Unknown op type: ${op.type}`,
            });
            continue;
          }

          await fastify.prisma.syncOp.create({
            data: { userId, opId: op.id },
          });
          result.applied.push(op.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          result.failed.push({
            opId: op.id,
            code: "APPLY_FAILED",
            message,
          });
        }
      }

      return reply.send(result);
    }
  );
}
