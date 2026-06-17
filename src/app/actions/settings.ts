"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";
import { z } from "zod";
import nodemailer from "nodemailer";

import { requireAdmin, requireSession } from "@/lib/access";
import {
  APPLICATION_SETTINGS_ID,
  getApplicationSettings,
} from "@/lib/application-settings";
import { writeAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { applicationSettings, user } from "@/lib/db/schema";
import {
  getAdminIntegrationSettingsSummary,
  getSmtpIntegrationSettings,
} from "@/lib/integration-settings";
import { testTwentyConnection } from "@/lib/twenty/client";
import { saveUploadedImage } from "@/lib/uploads";

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const imageReferenceSchema = z
  .union([
    z.literal(""),
    z.url(),
    z.string().regex(/^\/api\/uploads\/[A-Za-z0-9-_.]+$/),
  ])
  .transform((value) => value || null);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  image: imageReferenceSchema,
});

const applicationSettingsSchema = z.object({
  brandName: z.string().trim().min(1).max(80),
  brandLogoUrl: imageReferenceSchema,
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  portalTitle: z.string().trim().min(1).max(100),
  portalDescription: z.string().trim().min(1).max(240),
  supportEmail: z
    .union([z.literal(""), z.email()])
    .transform((value) => value || null),
});

const smtpSettingsSchema = z.object({
  smtpHost: z.string().trim().optional().or(z.literal("")),
  smtpPort: z.coerce.number().int().positive().default(587),
  smtpSecure: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((value) => value === "on" || value === "true"),
  smtpUser: z.string().trim().optional().or(z.literal("")),
  smtpPassword: z.string().optional().or(z.literal("")),
  smtpFrom: z.string().trim().optional().or(z.literal("")),
  testEmail: z.union([z.literal(""), z.email()]).optional(),
});

const twentySettingsSchema = z.object({
  twentyBaseUrl: z.union([z.literal(""), z.url()]),
  twentyApiKey: z.string().optional().or(z.literal("")),
  twentyWebhookSecret: z.string().optional().or(z.literal("")),
});

export async function updateProfileAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const current = await requireSession();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    image: formData.get("image"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the profile fields.",
    };
  }

  let image = parsed.data.image;
  try {
    image =
      (await saveUploadedImage(formData.get("imageFile") as File | null)) ??
      image;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Upload failed.",
    };
  }

  await db
    .update(user)
    .set({
      name: parsed.data.name,
      image,
      updatedAt: new Date(),
    })
    .where(eq(user.id, current.user.id));

  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");

  return { status: "success", message: "Profile updated." };
}

export async function updateApplicationSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const current = await requireAdmin();
  const parsed = applicationSettingsSchema.safeParse({
    brandName: formData.get("brandName"),
    brandLogoUrl: formData.get("brandLogoUrl"),
    primaryColor: formData.get("primaryColor"),
    portalTitle: formData.get("portalTitle"),
    portalDescription: formData.get("portalDescription"),
    supportEmail: formData.get("supportEmail"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the branding fields.",
    };
  }

  let brandLogoUrl = parsed.data.brandLogoUrl;
  try {
    brandLogoUrl =
      (await saveUploadedImage(formData.get("brandLogoFile") as File | null)) ??
      brandLogoUrl;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Logo upload failed.",
    };
  }

  const before = await getApplicationSettings();
  await db
    .insert(applicationSettings)
    .values({
      id: APPLICATION_SETTINGS_ID,
      ...parsed.data,
      brandLogoUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: applicationSettings.id,
      set: {
        ...parsed.data,
        brandLogoUrl,
        updatedAt: new Date(),
      },
    });

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "application.settings.update",
    status: "success",
    before,
    after: { ...parsed.data, brandLogoUrl },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");

  return { status: "success", message: "Application settings updated." };
}

export async function updateTwentySettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const current = await requireAdmin();
  const parsed = twentySettingsSchema.safeParse({
    twentyBaseUrl: formData.get("twentyBaseUrl"),
    twentyApiKey: formData.get("twentyApiKey"),
    twentyWebhookSecret: formData.get("twentyWebhookSecret"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Check the Twenty CRM fields.",
    };
  }

  const existing = await getAdminIntegrationSettingsSummary();
  const set = {
    twentyBaseUrl: parsed.data.twentyBaseUrl || null,
    twentyApiKey:
      parsed.data.twentyApiKey?.trim() || (existing.hasTwentyApiKey ? undefined : null),
    twentyWebhookSecret:
      parsed.data.twentyWebhookSecret?.trim() ||
      (existing.hasTwentyWebhookSecret ? undefined : null),
    updatedAt: new Date(),
  };

  await db
    .insert(applicationSettings)
    .values({
      id: APPLICATION_SETTINGS_ID,
      brandName: "Twenty Portal",
      primaryColor: "#3157d5",
      portalTitle: "Client portal",
      portalDescription: "Secure access to the records shared with your team.",
      ...Object.fromEntries(
        Object.entries(set).filter(([, value]) => value !== undefined),
      ),
    })
    .onConflictDoUpdate({
      target: applicationSettings.id,
      set: Object.fromEntries(
        Object.entries(set).filter(([, value]) => value !== undefined),
      ),
    });

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "integration.twenty.update",
    status: "success",
    metadata: {
      twentyBaseUrl: parsed.data.twentyBaseUrl || null,
      apiKeyChanged: Boolean(parsed.data.twentyApiKey?.trim()),
      webhookSecretChanged: Boolean(parsed.data.twentyWebhookSecret?.trim()),
    },
  });
  revalidatePath("/admin/settings");
  return { status: "success", message: "Twenty CRM settings saved." };
}

export async function testTwentySettingsAction(): Promise<SettingsActionState> {
  await requireAdmin();
  try {
    await testTwentyConnection();
    return { status: "success", message: "Twenty CRM connection succeeded." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Connection failed.",
    };
  }
}

export async function updateSmtpSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const current = await requireAdmin();
  const parsed = smtpSettingsSchema.safeParse({
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: formData.get("smtpSecure"),
    smtpUser: formData.get("smtpUser"),
    smtpPassword: formData.get("smtpPassword"),
    smtpFrom: formData.get("smtpFrom"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the SMTP fields.",
    };
  }

  const existing = await getAdminIntegrationSettingsSummary();
  const set = {
    smtpHost: parsed.data.smtpHost || null,
    smtpPort: parsed.data.smtpPort,
    smtpSecure: parsed.data.smtpSecure,
    smtpUser: parsed.data.smtpUser || null,
    smtpPassword:
      parsed.data.smtpPassword?.trim() ||
      (existing.hasSmtpPassword ? undefined : null),
    smtpFrom: parsed.data.smtpFrom || null,
    updatedAt: new Date(),
  };

  await db
    .insert(applicationSettings)
    .values({
      id: APPLICATION_SETTINGS_ID,
      brandName: "Twenty Portal",
      primaryColor: "#3157d5",
      portalTitle: "Client portal",
      portalDescription: "Secure access to the records shared with your team.",
      ...Object.fromEntries(
        Object.entries(set).filter(([, value]) => value !== undefined),
      ),
    })
    .onConflictDoUpdate({
      target: applicationSettings.id,
      set: Object.fromEntries(
        Object.entries(set).filter(([, value]) => value !== undefined),
      ),
    });

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "integration.smtp.update",
    status: "success",
    metadata: {
      host: parsed.data.smtpHost || null,
      passwordChanged: Boolean(parsed.data.smtpPassword?.trim()),
    },
  });
  revalidatePath("/admin/settings");
  return { status: "success", message: "SMTP settings saved." };
}

export async function testSmtpSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();
  const testEmail = z.email().safeParse(formData.get("testEmail"));
  if (!testEmail.success) {
    return { status: "error", message: "Enter a valid test email address." };
  }
  const settings = await getSmtpIntegrationSettings();
  if (!settings) {
    return { status: "error", message: "SMTP is not configured." };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth:
        settings.user && settings.password
          ? { user: settings.user, pass: settings.password }
          : undefined,
    });
    await transporter.sendMail({
      from: settings.from,
      to: testEmail.data,
      subject: "Twenty Client Portal SMTP test",
      text: "SMTP is configured correctly.",
      html: "<p>SMTP is configured correctly.</p>",
    });
    return { status: "success", message: "Test email sent." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "SMTP test failed.",
    };
  }
}
