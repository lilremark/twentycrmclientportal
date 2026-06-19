import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

import { db } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import {
  getEnv,
  getTrustedOrigins,
  shouldUseSecureCookies,
} from "@/lib/env";
import {
  hashPortalPassword,
  verifyPortalPassword,
} from "@/lib/password";
import { getOAuthIntegrationSettings } from "@/lib/integration-settings";

const env = getEnv();

function createAuth(
  oauth: Awaited<ReturnType<typeof getOAuthIntegrationSettings>>,
) {
  const googleEnabled =
    oauth.google.enabled &&
    Boolean(oauth.google.clientId && oauth.google.clientSecret);
  const customEnabled =
    oauth.custom.enabled &&
    Boolean(
      oauth.custom.clientId &&
        oauth.custom.clientSecret &&
        (oauth.custom.discoveryUrl ||
          (oauth.custom.authorizationUrl && oauth.custom.tokenUrl)),
    );

  return betterAuth({
    appName: "Twenty Client Portal",
    baseURL: env.APP_URL,
    secret: env.AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    trustedOrigins: getTrustedOrigins(),
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: oauth.google.clientId,
            clientSecret: oauth.google.clientSecret,
            hd: oauth.google.hostedDomain || undefined,
            disableImplicitSignUp: true,
          },
        }
      : {},
    plugins: [
      genericOAuth({
        config: customEnabled
          ? [
              {
                providerId: "custom-oauth",
                clientId: oauth.custom.clientId,
                clientSecret: oauth.custom.clientSecret,
                discoveryUrl: oauth.custom.discoveryUrl || undefined,
                authorizationUrl: oauth.custom.authorizationUrl || undefined,
                tokenUrl: oauth.custom.tokenUrl || undefined,
                userInfoUrl: oauth.custom.userInfoUrl || undefined,
                issuer: oauth.custom.issuer || undefined,
                scopes: oauth.custom.scopes,
                pkce: oauth.custom.pkce,
                disableImplicitSignUp: true,
                disableSignUp: true,
              },
            ]
          : [],
      }),
    ],
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "custom-oauth"],
        allowDifferentEmails: false,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => false,
        },
      },
      session: {
        create: {
          before: async (candidate) => {
            const profile = await db.query.user.findFirst({
              where: (table, { eq }) => eq(table.id, candidate.userId),
              columns: { isActive: true },
            });
            return profile?.isActive ? undefined : false;
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: hashPortalPassword,
        verify: verifyPortalPassword,
      },
      sendResetPassword: async ({ user: authUser, url }) => {
        await sendEmail({
          to: authUser.email,
          subject: "Reset your Twenty Portal password",
          text: `Reset your password: ${url}`,
          html: `<p>Reset your password using the link below.</p><p><a href="${url}">Reset password</a></p>`,
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      useSecureCookies: shouldUseSecureCookies(env.APP_URL),
      database: {
        generateId: "uuid",
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
    },
  });
}

let authCache:
  | {
      key: string;
      auth: ReturnType<typeof createAuth>;
    }
  | undefined;

export function invalidateAuthCache() {
  authCache = undefined;
}

export async function getAuth() {
  const oauth = await getOAuthIntegrationSettings();
  const key = JSON.stringify(oauth);
  if (!authCache || authCache.key !== key) {
    authCache = { key, auth: createAuth(oauth) };
  }
  return authCache.auth;
}
