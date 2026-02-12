import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { sendError } from "../lib/errors.js";

const createHabitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional(),
});

const updateHabitSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  isArchived: z.boolean().optional(),
});

function habitSelect() {
  return {
    id: true,
    name: true,
    color: true,
    isArchived: true,
    createdAt: true,
    updatedAt: true,
  };
}

export async function habitsRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get(
    "/habits",
    {
      schema: {
        description: "List user habits",
        tags: ["habits"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            includeArchived: { type: "boolean", default: false },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              habits: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const includeArchived = (request.query as { includeArchived?: boolean }).includeArchived ?? false;

      const habits = await fastify.prisma.habit.findMany({
        where: {
          userId: payload.sub,
          ...(includeArchived ? {} : { isArchived: false }),
        },
        select: habitSelect(),
        orderBy: { createdAt: "asc" },
      });

      return reply.send({ habits });
    }
  );

  fastify.post(
    "/habits",
    {
      schema: {
        description: "Create a habit",
        tags: ["habits"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            color: { type: "string" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              habit: { type: "object" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const parsed = createHabitSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          parsed.error.flatten()
        );
      }

      const habit = await fastify.prisma.habit.create({
        data: {
          userId: payload.sub,
          name: parsed.data.name,
          color: parsed.data.color,
        },
        select: habitSelect(),
      });

      return reply.status(201).send({ habit });
    }
  );

  fastify.patch(
    "/habits/:id",
    {
      schema: {
        description: "Update a habit",
        tags: ["habits"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            color: { type: "string" },
            isArchived: { type: "boolean" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              habit: { type: "object" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const { id } = request.params;
      const parsed = updateHabitSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          parsed.error.flatten()
        );
      }

      const existing = await fastify.prisma.habit.findFirst({
        where: { id, userId: payload.sub },
      });

      if (!existing) {
        return sendError(reply, 404, "NOT_FOUND", "Habit not found");
      }

      const habit = await fastify.prisma.habit.update({
        where: { id },
        data: parsed.data,
        select: habitSelect(),
      });

      return reply.send({ habit });
    }
  );

  fastify.delete(
    "/habits/:id",
    {
      schema: {
        description: "Archive a habit (soft delete)",
        tags: ["habits"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              habit: { type: "object" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const { id } = request.params;

      const existing = await fastify.prisma.habit.findFirst({
        where: { id, userId: payload.sub },
      });

      if (!existing) {
        return sendError(reply, 404, "NOT_FOUND", "Habit not found");
      }

      const habit = await fastify.prisma.habit.update({
        where: { id },
        data: { isArchived: true },
        select: habitSelect(),
      });

      return reply.send({ habit });
    }
  );
}
