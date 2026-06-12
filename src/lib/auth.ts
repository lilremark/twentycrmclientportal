import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";

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

const env = getEnv();

export const auth = betterAuth({
  appName: "Twenty Client Portal",
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  trustedOrigins: getTrustedOrigins(),
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
