"use server";

import { timingSafeEqual } from "node:crypto";

import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAuditEvent } from "@/lib/audit";
import { acceptInvitation, createCredentialUser } from "@/lib/credentials";
import { db } from "@/lib/db";
import { applicationSettings, portalAdministrators } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { APPLICATION_SETTINGS_ID } from "@/lib/application-settings";
import {
  saveUploadedImage,
  saveUploadedPngBackground,
} from "@/lib/uploads";
import {
  createSmtpTransport,
  formatSmtpError,
  validateSmtpEncryptionMode,
} from "@/lib/smtp";
import { normalizeTwentyBaseUrl } from "@/lib/twenty/url";

const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export type AuthActionState = { error?: string };
export type SetupSmtpTestState = {
  status: "success" | "error";
  message: string;
};

function safeTokenEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function testSetupSmtpAction(
  formData: FormData,
): Promise<SetupSmtpTestState> {
  try {
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(portalAdministrators);
    if (adminCount > 0) {
      return {
        status: "error",
        message: "Initial setup has already been completed.",
      };
    }

    const parsed = z
      .object({
        setupToken: z.string().min(1, "Enter the setup token first."),
        smtpHost: z.string().trim().min(1, "Enter an SMTP host."),
        smtpPort: z.coerce.number().int().positive(),
        smtpSecure: z
          .union([
            z.literal("on"),
            z.literal("true"),
            z.literal("false"),
            z.null(),
          ])
          .optional()
          .transform((value) => value === "on" || value === "true"),
        smtpUser: z.string().trim().optional(),
        smtpPassword: z.string().optional(),
      })
      .safeParse({
        setupToken: formData.get("setupToken"),
        smtpHost: formData.get("smtpHost"),
        smtpPort: formData.get("smtpPort"),
        smtpSecure: formData.get("smtpSecure"),
        smtpUser: formData.get("smtpUser"),
        smtpPassword: formData.get("smtpPassword"),
      });
    if (!parsed.success) {
      return {
        status: "error",
        message:
          parsed.error.issues[0]?.message ?? "Check the SMTP connection fields.",
      };
    }
    const input = parsed.data;

    if (!safeTokenEqual(input.setupToken, getEnv().SETUP_TOKEN)) {
      return { status: "error", message: "The setup token is invalid." };
    }

    const transporter = createSmtpTransport({
      host: input.smtpHost,
      port: input.smtpPort,
      secure: input.smtpSecure,
      user: input.smtpUser,
      password: input.smtpPassword,
    });

    try {
      await transporter.verify();
    } finally {
      transporter.close();
    }

    return {
      status: "success",
      message: "SMTP connection and credentials verified.",
    };
  } catch (error) {
    return {
      status: "error",
      message: formatSmtpError(error),
    };
  }
}

export async function setupAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(portalAdministrators);
    if (adminCount > 0) {
      return { error: "Initial setup has already been completed." };
    }

    const input = z
      .object({
        setupToken: z.string(),
        name: z.string().trim().min(2),
        email: z.email(),
        password: passwordSchema,
        brandName: z.string().trim().min(1).max(80).default("Twenty Portal"),
        brandLogoUrl: z
          .union([
            z.literal(""),
            z.url(),
            z.string().regex(/^\/api\/uploads\/[A-Za-z0-9-_.]+$/),
          ])
          .optional(),
        loginBackgroundUrl: z
          .union([
            z.literal(""),
            z.url(),
            z.string().regex(/^\/api\/uploads\/[A-Za-z0-9-_.]+$/),
          ])
          .optional(),
        primaryColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default("#3157d5"),
        portalTitle: z.string().trim().min(1).max(100).default("Client portal"),
        portalDescription: z
          .string()
          .trim()
          .min(1)
          .max(240)
          .default("Secure access to the records shared with your team."),
        supportEmail: z.union([z.literal(""), z.email()]).optional(),
        twentyBaseUrl: z.string().trim().optional(),
        twentyAutoFormatUrl: z
          .union([
            z.literal("on"),
            z.literal("true"),
            z.literal("false"),
            z.null(),
          ])
          .optional()
          .transform((value) => value === "on" || value === "true"),
        twentyApiKey: z.string().optional(),
        twentyWebhookSecret: z.string().optional(),
        smtpHost: z.string().trim().optional(),
        smtpPort: z.coerce.number().int().positive().default(587),
        smtpSecure: z
          .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
          .optional()
          .transform((value) => value === "on" || value === "true"),
        smtpUser: z.string().trim().optional(),
        smtpPassword: z.string().optional(),
        smtpFrom: z.string().trim().optional(),
      })
      .parse(Object.fromEntries(formData));

    if (!safeTokenEqual(input.setupToken, getEnv().SETUP_TOKEN)) {
      return { error: "The setup token is invalid." };
    }
    if (input.smtpHost) {
      validateSmtpEncryptionMode({
        port: input.smtpPort,
        secure: input.smtpSecure,
      });
    }

    const userId = await createCredentialUser({
      name: input.name,
      email: input.email,
      password: input.password,
      isAdmin: true,
    });
    const uploadedLogo = await saveUploadedImage(
      formData.get("brandLogoFile") as File | null,
    );
    const uploadedBackground = await saveUploadedPngBackground(
      formData.get("loginBackgroundFile") as File | null,
    );
    await db.insert(applicationSettings).values({
      id: APPLICATION_SETTINGS_ID,
      brandName: input.brandName,
      brandLogoUrl: uploadedLogo ?? input.brandLogoUrl ?? null,
      loginBackgroundUrl:
        uploadedBackground ?? input.loginBackgroundUrl ?? null,
      primaryColor: input.primaryColor,
      portalTitle: input.portalTitle,
      portalDescription: input.portalDescription,
      supportEmail: input.supportEmail || null,
      twentyBaseUrl:
        input.twentyBaseUrl && input.twentyAutoFormatUrl
          ? normalizeTwentyBaseUrl(input.twentyBaseUrl)
          : input.twentyBaseUrl
            ? /^[a-z][a-z0-9+.-]*:\/\//i.test(input.twentyBaseUrl)
              ? input.twentyBaseUrl
              : `https://${input.twentyBaseUrl}`
            : null,
      twentyAutoFormatUrl: input.twentyAutoFormatUrl,
      twentyApiKey: input.twentyApiKey?.trim() || null,
      twentyWebhookSecret: input.twentyWebhookSecret?.trim() || null,
      smtpHost: input.smtpHost || null,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUser: input.smtpUser || null,
      smtpPassword: input.smtpPassword?.trim() || null,
      smtpFrom: input.smtpFrom || null,
    });
    await writeAuditEvent({
      actorUserId: userId,
      action: "setup.completed",
      status: "success",
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Setup failed.",
    };
  }

  redirect("/login?setup=complete");
}

export async function acceptInvitationAction(
  token: string,
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const password = passwordSchema.parse(formData.get("password"));
    const userId = await acceptInvitation({ token, password });
    await writeAuditEvent({
      actorUserId: userId,
      action: "invitation.accepted",
      status: "success",
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Invitation acceptance failed.",
    };
  }

  redirect("/login?invitation=accepted");
}
