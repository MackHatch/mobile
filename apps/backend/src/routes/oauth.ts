import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { sendError } from "../lib/errors.js";
import { verifyGoogleIdToken, verifyAppleIdToken } from "../lib/oidc.js";

const exchangeSchema = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(1),
  name: z.string().optional(),
});

const linkSchema = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(1),
  name: z.string().optional(),
});

function userSelect() {
  return { id: true, email: true, name: true, createdAt: true };
}

export async function oauthRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/auth/oauth/exchange",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Exchange OAuth id_token for app JWT. Creates or links user.",
        tags: ["auth"],
        body: {
          type: "object",
          required: ["provider", "idToken"],
          properties: {
            provider: { type: "string", enum: ["google", "apple"] },
            idToken: { type: "string" },
            name: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              token: { type: "string" },
              user: { type: "object" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = exchangeSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          parsed.error.flatten()
        );
      }

      const { provider, idToken, name: nameOverride } = parsed.data;

      let claims;
      try {
        if (provider === "google") {
          claims = await verifyGoogleIdToken(idToken);
        } else {
          claims = await verifyAppleIdToken(idToken);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid token";
        return sendError(reply, 401, "INVALID_ID_TOKEN", msg);
      }

      const { sub, email, name } = claims;
      const displayName = nameOverride ?? name;

      let user;

      const existingIdentity = await fastify.prisma.oAuthIdentity.findUnique({
        where: {
          provider_providerUserId: { provider, providerUserId: sub },
        },
        include: { user: true },
      });

      if (existingIdentity) {
        user = existingIdentity.user;
      } else {
        const existingUser = email
          ? await fastify.prisma.user.findUnique({ where: { email } })
          : null;

        if (existingUser) {
          await fastify.prisma.oAuthIdentity.create({
            data: {
              userId: existingUser.id,
              provider,
              providerUserId: sub,
              email: email ?? null,
            },
          });
          user = existingUser;
        } else {
          const syntheticEmail = email ?? `oauth.${provider}.${sub}@placeholder.local`;
          user = await fastify.prisma.user.create({
            data: {
              email: syntheticEmail,
              passwordHash: null,
              name: displayName ?? null,
            },
            select: userSelect(),
          });
          await fastify.prisma.oAuthIdentity.create({
            data: {
              userId: user.id,
              provider,
              providerUserId: sub,
              email: email ?? null,
            },
          });
        }
      }

      const accessToken = fastify.jwt.sign({
        sub: user.id,
        email: user.email,
      });

      const userData = await fastify.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: userSelect(),
      });

      return reply.send({ token: accessToken, user: userData });
    }
  );

  fastify.post(
    "/auth/oauth/link",
    {
      onRequest: [fastify.authenticate],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        description: "Link OAuth identity to current user. Requires auth.",
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["provider", "idToken"],
          properties: {
            provider: { type: "string", enum: ["google", "apple"] },
            idToken: { type: "string" },
            name: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              linked: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const userId = payload.sub;

      const parsed = linkSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          400,
          "VALIDATION_ERROR",
          "Validation failed",
          parsed.error.flatten()
        );
      }

      const { provider, idToken } = parsed.data;

      let claims;
      try {
        if (provider === "google") {
          claims = await verifyGoogleIdToken(idToken);
        } else {
          claims = await verifyAppleIdToken(idToken);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid token";
        return sendError(reply, 401, "INVALID_ID_TOKEN", msg);
      }

      const { sub } = claims;

      const existingIdentity = await fastify.prisma.oAuthIdentity.findUnique({
        where: {
          provider_providerUserId: { provider, providerUserId: sub },
        },
      });

      if (existingIdentity) {
        if (existingIdentity.userId === userId) {
          return reply.send({ linked: true });
        }
        return sendError(
          reply,
          409,
          "OAUTH_IDENTITY_IN_USE",
          "This account is already linked to another user"
        );
      }

      await fastify.prisma.oAuthIdentity.create({
        data: {
          userId,
          provider,
          providerUserId: sub,
          email: claims.email ?? null,
        },
      });

      return reply.send({ linked: true });
    }
  );

  fastify.delete<{ Params: { provider: string } }>(
    "/auth/oauth/unlink/:provider",
    {
      onRequest: [fastify.authenticate],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        description: "Unlink OAuth provider from current user. Must keep at least one login method.",
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["provider"],
          properties: {
            provider: { type: "string", enum: ["google", "apple"] },
          },
        },
        response: {
          200: { type: "object", properties: { unlinked: { type: "boolean" } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { provider: string } }>, reply: FastifyReply) => {
      const payload = request.user! as { sub: string };
      const userId = payload.sub;
      const { provider } = request.params;

      if (provider !== "google" && provider !== "apple") {
        return sendError(reply, 400, "INVALID_PROVIDER", "Provider must be google or apple");
      }

      const [user, identities] = await Promise.all([
        fastify.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { passwordHash: true },
        }),
        fastify.prisma.oAuthIdentity.findMany({
          where: { userId },
          select: { provider: true },
        }),
      ]);

      const hasPassword = !!user.passwordHash;
      const otherProviders = identities.filter((i) => i.provider !== provider);
      const linkedProviderCount = identities.length;
      const willHaveProvider = otherProviders.length > 0;
      const willHavePassword = hasPassword;

      if (linkedProviderCount === 0) {
        return sendError(
          reply,
          409,
          "CANNOT_UNLINK_LAST_AUTH_METHOD",
          "Provider is not linked"
        );
      }

      if (!willHaveProvider && !willHavePassword) {
        return sendError(
          reply,
          409,
          "CANNOT_UNLINK_LAST_AUTH_METHOD",
          "You must keep at least one login method (password or another provider)"
        );
      }

      const deleted = await fastify.prisma.oAuthIdentity.deleteMany({
        where: {
          userId,
          provider,
        },
      });

      if (deleted.count === 0) {
        return sendError(reply, 404, "NOT_LINKED", "Provider is not linked to your account");
      }

      return reply.send({ unlinked: true });
    }
  );
}
