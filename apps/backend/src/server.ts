import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { env } from "./env.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { jwtPlugin } from "./plugins/jwt.js";
import { corsPlugin } from "./plugins/cors.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { rateLimitPlugin } from "./plugins/rateLimit.js";
import { authRoutes } from "./routes/auth.js";
import { oauthRoutes } from "./routes/oauth.js";
import { habitsRoutes } from "./routes/habits.js";
import { checkinsRoutes } from "./routes/checkins.js";
import { insightsRoutes } from "./routes/insights.js";
import { syncRoutes } from "./routes/sync.js";
import { pushRoutes } from "./routes/push.js";

export async function buildServer() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(sensible);
  await fastify.register(corsPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(swaggerPlugin);

  await fastify.register(authRoutes, { prefix: "/api" });
  await fastify.register(oauthRoutes, { prefix: "/api" });
  await fastify.register(habitsRoutes, { prefix: "/api" });
  await fastify.register(checkinsRoutes, { prefix: "/api" });
  await fastify.register(insightsRoutes, { prefix: "/api" });
  await fastify.register(syncRoutes, { prefix: "/api" });
  await fastify.register(pushRoutes, { prefix: "/api" });

  fastify.get("/health", async () => ({ status: "ok" }));

  return fastify;
}

export async function startServer() {
  const server = await buildServer();

  try {
    await server.listen({ port: env.PORT, host: "0.0.0.0" });
    server.log.info(`Backend listening at http://localhost:${env.PORT}`);
    server.log.info(`Swagger docs at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  return server;
}
