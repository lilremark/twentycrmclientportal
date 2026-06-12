import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.url(),
  TRUSTED_ORIGINS: optionalString,
  AUTH_SECRET: z.string().min(32),
  SETUP_TOKEN: z.string().min(16),
  TWENTY_BASE_URL: z.url(),
  TWENTY_API_KEY: z.string().min(1),
  TWENTY_WEBHOOK_SECRET: z.string().min(16),
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM: z.string().default("Twenty Portal <portal@example.com>"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

let cachedEnv: z.infer<typeof envSchema> | undefined;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}

export function getTrustedOrigins() {
  const env = getEnv();
  return [
    env.APP_URL,
    ...(env.TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter((origin, index, origins) => origins.indexOf(origin) === index);
}

export function resetEnvForTests() {
  cachedEnv = undefined;
}
