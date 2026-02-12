import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

/**
 * In-memory rate limiter. Redis-ready: pass redis instance to opts when REDIS_URL is set.
 * @see https://github.com/fastify/fastify-rate-limit#redis
 */
export async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    skipOnError: true,
    errorResponseBuilder: (_request, context) => {
      const after = typeof context.after === "string" ? parseInt(context.after, 10) : (context.after as number) ?? 60;
      const retryAfter = typeof after === "number" && after > 1000 ? Math.ceil(after / 1000) : Math.ceil(Number(after));
      return {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Rate limit exceeded, retry in ${retryAfter} seconds`,
          details: { retryAfter },
        },
      };
    },
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
  });
}
