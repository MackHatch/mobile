import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  BACKEND_PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().default("change_me_in_production"),
  REDIS_URL: z.string().optional().transform((v) => (v === "" ? undefined : v)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse({
  ...process.env,
  PORT: process.env.PORT ?? process.env.BACKEND_PORT ?? 4000,
});

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;
