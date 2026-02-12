import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { sendError } from "../lib/errors.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function userSelect() {
  return { id: true, email: true, name: true, createdAt: true };
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/auth/register",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        description: "Register a new user",
        tags: ["auth"],
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            name: { type: "string" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              user: { type: "object" },
              token: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          parsed.error.flatten()
        );
      }

      const { email, password, name } = parsed.data;
      const existing = await fastify.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return sendError(reply, 409, "EMAIL_EXISTS", "Email already registered");
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await fastify.prisma.user.create({
        data: { email, passwordHash, name },
        select: userSelect(),
      });

      const token = fastify.jwt.sign({ sub: user.id, email: user.email });
      return reply.status(201).send({ user, token });
    }
  );

  fastify.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        description: "Login with email and password",
        tags: ["auth"],
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              user: { type: "object" },
              token: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          parsed.error.flatten()
        );
      }

      const { email, password } = parsed.data;
      const user = await fastify.prisma.user.findUnique({ where: { email } });
      if (!user) {
        return sendError(reply, 401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      if (!user.passwordHash) {
        return sendError(reply, 401, "INVALID_CREDENTIALS", "Use sign-in with Google or Apple");
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return sendError(reply, 401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const token = fastify.jwt.sign({ sub: user.id, email: user.email });
      return reply.send({
        user: await fastify.prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: userSelect(),
        }),
        token,
      });
    }
  );

  fastify.get(
    "/auth/me",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: "Get current user with linked providers",
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              user: { type: "object" },
              linkedProviders: { type: "array", items: { type: "string" } },
              hasPassword: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const userId = payload.sub;

      const [userRow, identities] = await Promise.all([
        fastify.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, email: true, name: true, createdAt: true, passwordHash: true },
        }),
        fastify.prisma.oAuthIdentity.findMany({
          where: { userId },
          select: { provider: true },
        }),
      ]);

      const linkedProviders = identities.map((i) => i.provider);
      const hasPassword = !!userRow.passwordHash;

      const user = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        createdAt: userRow.createdAt,
      };

      return reply.send({
        user,
        linkedProviders,
        hasPassword,
      });
    }
  );
}
