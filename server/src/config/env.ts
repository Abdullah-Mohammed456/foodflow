import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  AUTH_LOGIN_WINDOW_MS: z.coerce.number().int().min(1_000).default(15 * 60 * 1_000),
  AUTH_LOGIN_LIMIT: z.coerce.number().int().min(1).max(100).default(5),
  AUTH_REGISTER_WINDOW_MS: z.coerce.number().int().min(1_000).default(60 * 60 * 1_000),
  AUTH_REGISTER_LIMIT: z.coerce.number().int().min(1).max(100).default(5),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    process.stderr.write(`Invalid environment configuration: ${JSON.stringify(details)}\n`);
    throw new Error("Invalid environment configuration");
  }
  cached = parsed.data;
  return cached;
}
