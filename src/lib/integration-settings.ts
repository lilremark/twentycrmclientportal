import "server-only";

import { eq } from "drizzle-orm";

import {
  APPLICATION_SETTINGS_ID,
  getApplicationSettings,
} from "@/lib/application-settings";
import { db } from "@/lib/db";
import { applicationSettings } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { normalizeTwentyBaseUrl } from "@/lib/twenty/url";

export type TwentyIntegrationSettings = {
  baseUrl: string;
  autoFormatUrl: boolean;
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

export type OAuthIntegrationSettings = {
  updatedAt: Date | null;
  google: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    hostedDomain: string;
  };
  custom: {
    enabled: boolean;
    name: string;
    clientId: string;
    clientSecret: string;
    discoveryUrl: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    issuer: string;
    scopes: string[];
    pkce: boolean;
  };
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
  const configuredBaseUrl =
    clean(row?.twentyBaseUrl) ?? clean(env.TWENTY_BASE_URL);
  const autoFormatUrl = row?.twentyAutoFormatUrl ?? true;
  const baseUrl =
    configuredBaseUrl && autoFormatUrl
      ? normalizeTwentyBaseUrl(configuredBaseUrl)
      : configuredBaseUrl;
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
    autoFormatUrl,
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
    twentyAutoFormatUrl: row?.twentyAutoFormatUrl ?? true,
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
    googleOauthEnabled: row?.googleOauthEnabled ?? false,
    googleOauthClientId: clean(row?.googleOauthClientId) ?? "",
    hasGoogleOauthClientSecret: Boolean(clean(row?.googleOauthClientSecret)),
    googleOauthHostedDomain: clean(row?.googleOauthHostedDomain) ?? "",
    customOauthEnabled: row?.customOauthEnabled ?? false,
    customOauthName: clean(row?.customOauthName) ?? "Single sign-on",
    customOauthClientId: clean(row?.customOauthClientId) ?? "",
    hasCustomOauthClientSecret: Boolean(clean(row?.customOauthClientSecret)),
    customOauthDiscoveryUrl: clean(row?.customOauthDiscoveryUrl) ?? "",
    customOauthAuthorizationUrl:
      clean(row?.customOauthAuthorizationUrl) ?? "",
    customOauthTokenUrl: clean(row?.customOauthTokenUrl) ?? "",
    customOauthUserInfoUrl: clean(row?.customOauthUserInfoUrl) ?? "",
    customOauthIssuer: clean(row?.customOauthIssuer) ?? "",
    customOauthScopes: clean(row?.customOauthScopes) ?? "openid profile email",
    customOauthPkce: row?.customOauthPkce ?? true,
  };
}

export async function getOAuthIntegrationSettings(): Promise<OAuthIntegrationSettings> {
  const row = await getRawApplicationSettingsRow();
  return {
    updatedAt: row?.updatedAt ?? null,
    google: {
      enabled: row?.googleOauthEnabled ?? false,
      clientId: clean(row?.googleOauthClientId) ?? "",
      clientSecret: clean(row?.googleOauthClientSecret) ?? "",
      hostedDomain: clean(row?.googleOauthHostedDomain) ?? "",
    },
    custom: {
      enabled: row?.customOauthEnabled ?? false,
      name: clean(row?.customOauthName) ?? "Single sign-on",
      clientId: clean(row?.customOauthClientId) ?? "",
      clientSecret: clean(row?.customOauthClientSecret) ?? "",
      discoveryUrl: clean(row?.customOauthDiscoveryUrl) ?? "",
      authorizationUrl: clean(row?.customOauthAuthorizationUrl) ?? "",
      tokenUrl: clean(row?.customOauthTokenUrl) ?? "",
      userInfoUrl: clean(row?.customOauthUserInfoUrl) ?? "",
      issuer: clean(row?.customOauthIssuer) ?? "",
      scopes: (clean(row?.customOauthScopes) ?? "openid profile email")
        .split(/[\s,]+/)
        .filter(Boolean),
      pkce: row?.customOauthPkce ?? true,
    },
  };
}
