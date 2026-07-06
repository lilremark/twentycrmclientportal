import { z } from "zod";

import { isHttpUrl } from "@/lib/url-security";

const optionalString = z.string().trim().optional().or(z.literal(""));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.url().refine(isHttpUrl, "APP_URL must use HTTP or HTTPS."),
  TRUSTED_ORIGINS: optionalString,
  AUTH_SECRET: z.string().min(32),
  TWENTY_BASE_URL: optionalString,
  TWENTY_API_KEY: optionalString,
  TWENTY_WEBHOOK_SECRET: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM: z.string().default("Twenty Portal <portal@example.com>"),
  BRAND_NAME: z.string().trim().min(1).default("Twenty Portal"),
  BRAND_LOGO_URL: optionalString,
  BRAND_PRIMARY_COLOR: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#3157d5"),
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

export function shouldUseSecureCookies(appUrl: string) {
  return new URL(appUrl).protocol === "https:";
}

export function getBranding() {
  const env = getEnv();
  return {
    name: env.BRAND_NAME,
    logoUrl: env.BRAND_LOGO_URL || null,
    primaryColor: env.BRAND_PRIMARY_COLOR,
  };
}

export function resetEnvForTests() {
  cachedEnv = undefined;
}
