import "server-only";

import { eq } from "drizzle-orm";

import {
  APPLICATION_SETTINGS_ID,
  getApplicationSettings,
} from "@/lib/application-settings";
import { db } from "@/lib/db";
import { applicationSettings } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";

export type TwentyIntegrationSettings = {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
};

export type SmtpIntegrationSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  from: string;
};

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function getRawApplicationSettingsRow() {
  return db.query.applicationSettings.findFirst({
    where: eq(applicationSettings.id, APPLICATION_SETTINGS_ID),
  });
}

export async function getTwentyIntegrationSettings(): Promise<TwentyIntegrationSettings> {
  const [row, env] = await Promise.all([
    getRawApplicationSettingsRow(),
    Promise.resolve(getEnv()),
  ]);
  const baseUrl = clean(row?.twentyBaseUrl) ?? clean(env.TWENTY_BASE_URL);
  const apiKey = clean(row?.twentyApiKey) ?? clean(env.TWENTY_API_KEY);
  const webhookSecret =
    clean(row?.twentyWebhookSecret) ?? clean(env.TWENTY_WEBHOOK_SECRET);

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Twenty CRM is not configured. Add the base URL and API key in Admin Settings or environment variables.",
    );
  }

  return {
    baseUrl,
    apiKey,
    webhookSecret: webhookSecret ?? "",
  };
}

export async function getSmtpIntegrationSettings(): Promise<SmtpIntegrationSettings | null> {
  const [row, env, publicSettings] = await Promise.all([
    getRawApplicationSettingsRow(),
    Promise.resolve(getEnv()),
    getApplicationSettings(),
  ]);
  const host = clean(row?.smtpHost) ?? clean(env.SMTP_HOST);
  if (!host) return null;

  return {
    host,
    port: row?.smtpPort ?? env.SMTP_PORT,
    secure: row?.smtpSecure ?? env.SMTP_SECURE,
    user: clean(row?.smtpUser) ?? clean(env.SMTP_USER),
    password: clean(row?.smtpPassword) ?? clean(env.SMTP_PASSWORD),
    from:
      clean(row?.smtpFrom) ??
      clean(env.SMTP_FROM) ??
      publicSettings.supportEmail ??
      "Twenty Portal <portal@example.com>",
  };
}

export async function getAdminIntegrationSettingsSummary() {
  const [row, env] = await Promise.all([
    getRawApplicationSettingsRow(),
    Promise.resolve(getEnv()),
  ]);

  return {
    twentyBaseUrl: clean(row?.twentyBaseUrl) ?? clean(env.TWENTY_BASE_URL) ?? "",
    hasTwentyApiKey: Boolean(clean(row?.twentyApiKey) ?? clean(env.TWENTY_API_KEY)),
    hasTwentyWebhookSecret: Boolean(
      clean(row?.twentyWebhookSecret) ?? clean(env.TWENTY_WEBHOOK_SECRET),
    ),
    smtpHost: clean(row?.smtpHost) ?? clean(env.SMTP_HOST) ?? "",
    smtpPort: row?.smtpPort ?? env.SMTP_PORT,
    smtpSecure: row?.smtpSecure ?? env.SMTP_SECURE,
    smtpUser: clean(row?.smtpUser) ?? clean(env.SMTP_USER) ?? "",
    hasSmtpPassword: Boolean(clean(row?.smtpPassword) ?? clean(env.SMTP_PASSWORD)),
    smtpFrom: clean(row?.smtpFrom) ?? clean(env.SMTP_FROM) ?? "",
  };
}
