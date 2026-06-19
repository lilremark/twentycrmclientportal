"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";
import { z } from "zod";

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
import {
  createSmtpTransport,
  formatSmtpError,
  validateSmtpEncryptionMode,
} from "@/lib/smtp";
import { testTwentyConnection } from "@/lib/twenty/client";
import { normalizeTwentyBaseUrl } from "@/lib/twenty/url";
import {
  deleteUploadedFile,
  isLocalUploadReference,
  saveUploadedImage,
  saveUploadedPngBackground,
} from "@/lib/uploads";

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
  loginBackgroundUrl: imageReferenceSchema,
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

const invitationEmailTemplateSchema = z.object({
  invitationEmailSubject: z
    .string()
    .trim()
    .min(1, "Enter an invitation email subject.")
    .max(160)
    .refine((value) => !/[\r\n]/.test(value), {
      message: "The invitation subject must be a single line.",
    }),
  invitationEmailHtml: z
    .string()
    .trim()
    .min(1, "Enter an invitation email HTML template.")
    .max(200_000)
    .refine((value) => value.includes("{{invite_url}}"), {
      message: "The template must include {{invite_url}}.",
    }),
});

const twentySettingsSchema = z.object({
  twentyBaseUrl: z.string().trim(),
  twentyAutoFormatUrl: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((value) => value === "on" || value === "true"),
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

  const previousImage = current.user.image;
  let image =
    parsed.data.image ??
    (isLocalUploadReference(previousImage) ? previousImage : null);
  try {
    const uploadedImage = await saveUploadedImage(
      formData.get("imageFile") as File | null,
    );
    if (uploadedImage) image = uploadedImage;
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
  if (
    isLocalUploadReference(previousImage) &&
    previousImage !== image
  ) {
    await deleteUploadedFile(previousImage);
  }

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
    loginBackgroundUrl: formData.get("loginBackgroundUrl"),
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

  const before = await getApplicationSettings();
  let brandLogoUrl =
    parsed.data.brandLogoUrl ??
    (isLocalUploadReference(before.brandLogoUrl)
      ? before.brandLogoUrl
      : null);
  let loginBackgroundUrl =
    parsed.data.loginBackgroundUrl ??
    (isLocalUploadReference(before.loginBackgroundUrl)
      ? before.loginBackgroundUrl
      : null);
  try {
    const uploadedLogo = await saveUploadedImage(
      formData.get("brandLogoFile") as File | null,
    );
    const uploadedBackground = await saveUploadedPngBackground(
      formData.get("loginBackgroundFile") as File | null,
    );
    if (uploadedLogo) brandLogoUrl = uploadedLogo;
    if (uploadedBackground) loginBackgroundUrl = uploadedBackground;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Logo upload failed.",
    };
  }

  await db
    .insert(applicationSettings)
    .values({
      id: APPLICATION_SETTINGS_ID,
      ...parsed.data,
      brandLogoUrl,
      loginBackgroundUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: applicationSettings.id,
      set: {
        ...parsed.data,
        brandLogoUrl,
        loginBackgroundUrl,
        updatedAt: new Date(),
      },
    });
  if (
    isLocalUploadReference(before.brandLogoUrl) &&
    before.brandLogoUrl !== brandLogoUrl
  ) {
    await deleteUploadedFile(before.brandLogoUrl);
  }
  if (
    isLocalUploadReference(before.loginBackgroundUrl) &&
    before.loginBackgroundUrl !== loginBackgroundUrl
  ) {
    await deleteUploadedFile(before.loginBackgroundUrl);
  }

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "application.settings.update",
    status: "success",
    before,
    after: { ...parsed.data, brandLogoUrl, loginBackgroundUrl },
  });

  revalidateBranding();

  return { status: "success", message: "Application settings updated." };
}

export async function removeProfileImageAction() {
  const current = await requireSession();
  await db
    .update(user)
    .set({ image: null, updatedAt: new Date() })
    .where(eq(user.id, current.user.id));
  await deleteUploadedFile(current.user.image);
  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");
}

export async function removeBrandLogoAction() {
  const current = await requireAdmin();
  const before = await getApplicationSettings();
  await db
    .update(applicationSettings)
    .set({ brandLogoUrl: null, updatedAt: new Date() })
    .where(eq(applicationSettings.id, APPLICATION_SETTINGS_ID));
  await deleteUploadedFile(before.brandLogoUrl);
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "application.brand-logo.delete",
    status: "success",
    before: { brandLogoUrl: before.brandLogoUrl },
  });
  revalidateBranding();
}

export async function removeLoginBackgroundAction() {
  const current = await requireAdmin();
  const before = await getApplicationSettings();
  await db
    .update(applicationSettings)
    .set({ loginBackgroundUrl: null, updatedAt: new Date() })
    .where(eq(applicationSettings.id, APPLICATION_SETTINGS_ID));
  await deleteUploadedFile(before.loginBackgroundUrl);
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "application.login-background.delete",
    status: "success",
    before: { loginBackgroundUrl: before.loginBackgroundUrl },
  });
  revalidateBranding();
}

function revalidateBranding() {
  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");
  revalidatePath("/login");
  revalidatePath("/forgot-password");
  revalidatePath("/reset-password");
}

export async function updateTwentySettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const current = await requireAdmin();
  const parsed = twentySettingsSchema.safeParse({
    twentyBaseUrl: formData.get("twentyBaseUrl"),
    twentyAutoFormatUrl: formData.get("twentyAutoFormatUrl"),
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
  let twentyBaseUrl: string | null = null;
  if (parsed.data.twentyBaseUrl) {
    try {
      twentyBaseUrl = parsed.data.twentyAutoFormatUrl
        ? normalizeTwentyBaseUrl(parsed.data.twentyBaseUrl)
        : /^[a-z][a-z0-9+.-]*:\/\//i.test(parsed.data.twentyBaseUrl)
          ? parsed.data.twentyBaseUrl
          : `https://${parsed.data.twentyBaseUrl}`;
      new URL(twentyBaseUrl);
    } catch {
      return { status: "error", message: "Enter a valid Twenty CRM URL." };
    }
  }
  const set = {
    twentyBaseUrl,
    twentyAutoFormatUrl: parsed.data.twentyAutoFormatUrl,
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
      twentyAutoFormatUrl: parsed.data.twentyAutoFormatUrl,
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
  if (parsed.data.smtpHost) {
    try {
      validateSmtpEncryptionMode({
        port: parsed.data.smtpPort,
        secure: parsed.data.smtpSecure,
      });
    } catch (error) {
      return { status: "error", message: formatSmtpError(error) };
    }
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
    const transporter = createSmtpTransport(settings);
    try {
      await transporter.sendMail({
        from: settings.from,
        to: testEmail.data,
        subject: "Twenty Client Portal SMTP test",
        text: "SMTP is configured correctly.",
        html: "<p>SMTP is configured correctly.</p>",
      });
    } finally {
      transporter.close();
    }
    return { status: "success", message: "Test email sent." };
  } catch (error) {
    return {
      status: "error",
      message: formatSmtpError(error),
    };
  }
}

export async function updateInvitationEmailTemplateAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const current = await requireAdmin();
  const parsed = invitationEmailTemplateSchema.safeParse({
    invitationEmailSubject: formData.get("invitationEmailSubject"),
    invitationEmailHtml: formData.get("invitationEmailHtml"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Check the invitation email template.",
    };
  }

  const before = await getApplicationSettings();
  await db
    .insert(applicationSettings)
    .values({
      id: APPLICATION_SETTINGS_ID,
      brandName: "Twenty Portal",
      primaryColor: "#3157d5",
      portalTitle: "Client portal",
      portalDescription: "Secure access to the records shared with your team.",
      ...parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: applicationSettings.id,
      set: {
        ...parsed.data,
        updatedAt: new Date(),
      },
    });

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "application.invitation-email.update",
    status: "success",
    metadata: {
      previousCustomized: Boolean(
        before.invitationEmailSubject || before.invitationEmailHtml,
      ),
      templateLength: parsed.data.invitationEmailHtml.length,
    },
  });
  revalidatePath("/admin/settings");
  return { status: "success", message: "Invitation email template saved." };
}

export async function resetInvitationEmailTemplateAction(): Promise<SettingsActionState> {
  const current = await requireAdmin();
  await db
    .update(applicationSettings)
    .set({
      invitationEmailSubject: null,
      invitationEmailHtml: null,
      updatedAt: new Date(),
    })
    .where(eq(applicationSettings.id, APPLICATION_SETTINGS_ID));
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "application.invitation-email.reset",
    status: "success",
  });
  revalidatePath("/admin/settings");
  return {
    status: "success",
    message: "The branding-aware default invitation template is active.",
  };
}
