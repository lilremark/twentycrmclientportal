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

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  image: z
    .union([z.literal(""), z.url()])
    .transform((value) => value || null),
});

const applicationSettingsSchema = z.object({
  brandName: z.string().trim().min(1).max(80),
  brandLogoUrl: z
    .union([z.literal(""), z.url()])
    .transform((value) => value || null),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  portalTitle: z.string().trim().min(1).max(100),
  portalDescription: z.string().trim().min(1).max(240),
  supportEmail: z
    .union([z.literal(""), z.email()])
    .transform((value) => value || null),
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

  await db
    .update(user)
    .set({
      name: parsed.data.name,
      image: parsed.data.image,
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

  const before = await getApplicationSettings();
  await db
    .insert(applicationSettings)
    .values({
      id: APPLICATION_SETTINGS_ID,
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
    action: "application.settings.update",
    status: "success",
    before,
    after: parsed.data,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");

  return { status: "success", message: "Application settings updated." };
}
