import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { sendError } from "../lib/errors.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const registerSchema = z.object({
  expoPushToken: z.string().min(1, "expoPushToken required"),
  platform: z.enum(["ios", "android"]).optional(),
  deviceName: z.string().optional(),
});

const prefsSchema = z.object({
  enabled: z.boolean().optional(),
  timeLocal: z.string().regex(/^\d{1,2}:\d{2}$/, "timeLocal must be HH:mm or H:mm").optional(),
  timezone: z.string().min(1).optional(),
});

async function sendExpoPush(messages: Array<{ to: string; title?: string; body?: string }>): Promise<{ success: number; failed: string[] }> {
  if (messages.length === 0) return { success: 0, failed: [] };

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  const data = (await res.json()) as {
    data?: Array<{ status: string; id?: string; message?: string; details?: { error?: string } }>;
    errors?: Array<{ code: string; message: string }>;
  };

  if (!res.ok) {
    const errMsg = data.errors?.[0]?.message ?? `Expo push API error: ${res.status}`;
    throw new Error(errMsg);
  }

  const results = data.data ?? [];
  const failed: string[] = [];
  let success = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r?.status === "ok") {
      success++;
    } else {
      failed.push(messages[i]?.to ?? `index ${i}`);
    }
  }
  return { success, failed };
}

export async function pushRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post(
    "/push/register",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        description: "Register Expo push token",
        tags: ["push"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["expoPushToken"],
          properties: {
            expoPushToken: { type: "string" },
            platform: { type: "string", enum: ["ios", "android"] },
            deviceName: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { registered: { type: "boolean" } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const parsed = registerSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(reply, 400, "VALIDATION_ERROR", "Validation failed", parsed.error.flatten());
      }

      const { expoPushToken, platform, deviceName } = parsed.data;

      await fastify.prisma.pushToken.upsert({
        where: { expoPushToken },
        create: { userId: payload.sub, expoPushToken, platform, deviceName },
        update: { userId: payload.sub, platform, deviceName },
      });

      return reply.send({ registered: true });
    }
  );

  fastify.get(
    "/push/preferences",
    {
      schema: {
        description: "Get reminder preferences",
        tags: ["push"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              timeLocal: { type: "string" },
              timezone: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };

      const prefs = await fastify.prisma.reminderPreference.findUnique({
        where: { userId: payload.sub },
      });

      if (!prefs) {
        return reply.send({
          enabled: false,
          timeLocal: "20:30",
          timezone: "America/New_York",
        });
      }

      return reply.send({
        enabled: prefs.enabled,
        timeLocal: prefs.timeLocal,
        timezone: prefs.timezone,
      });
    }
  );

  fastify.put(
    "/push/preferences",
    {
      schema: {
        description: "Update reminder preferences",
        tags: ["push"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            timeLocal: { type: "string" },
            timezone: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              timeLocal: { type: "string" },
              timezone: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const parsed = prefsSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(reply, 400, "VALIDATION_ERROR", "Validation failed", parsed.error.flatten());
      }

      const data = parsed.data;
      if (Object.keys(data).length === 0) {
        const existing = await fastify.prisma.reminderPreference.findUnique({
          where: { userId: payload.sub },
        });
        return reply.send({
          enabled: existing?.enabled ?? false,
          timeLocal: existing?.timeLocal ?? "20:30",
          timezone: existing?.timezone ?? "America/New_York",
        });
      }

      const prefs = await fastify.prisma.reminderPreference.upsert({
        where: { userId: payload.sub },
        create: {
          userId: payload.sub,
          enabled: data.enabled ?? false,
          timeLocal: data.timeLocal ?? "20:30",
          timezone: data.timezone ?? "America/New_York",
        },
        update: {
          ...(data.enabled !== undefined && { enabled: data.enabled }),
          ...(data.timeLocal !== undefined && { timeLocal: data.timeLocal }),
          ...(data.timezone !== undefined && { timezone: data.timezone }),
        },
      });

      return reply.send({
        enabled: prefs.enabled,
        timeLocal: prefs.timeLocal,
        timezone: prefs.timezone,
      });
    }
  );

  fastify.post(
    "/push/send-test",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        description: "Send a test push notification to current user's devices",
        tags: ["push"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              sent: { type: "number" },
              tokens: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };

      const tokens = await fastify.prisma.pushToken.findMany({
        where: { userId: payload.sub },
        select: { expoPushToken: true },
      });

      if (tokens.length === 0) {
        return reply.send({ sent: 0, tokens: [] });
      }

      const messages = tokens.map((t) => ({
        to: t.expoPushToken,
        title: "Test notification",
        body: "This is a test from Habit & Mood Tracker!",
      }));

      try {
        const result = await sendExpoPush(messages);
        return reply.send({
          sent: result.success,
          tokens: tokens.map((t) => t.expoPushToken),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send push";
        return sendError(reply, 502, "PUSH_FAILED", msg);
      }
    }
  );
}
