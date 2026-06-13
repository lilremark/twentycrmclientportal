"use server";

import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/access";
import { writeAuditEvent } from "@/lib/audit";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/credentials";
import { db } from "@/lib/db";
import {
  clientAccounts,
  invitations,
  metadataSnapshots,
  portalViews,
  type TwentyObjectMetadata,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import {
  fieldConfigsFromNames,
  filterConfigsFromNames,
} from "@/lib/portal-view-config";
import {
  fetchTwentyMetadata,
  listTwentyRecords,
  testTwentyConnection,
} from "@/lib/twenty/client";
import { validatePortalViewConfiguration } from "@/lib/twenty/validation";

const portalViewSlugSchema = z
  .string()
  .trim()
  .min(2)
  .regex(/^[a-z0-9-]+$/)
  .refine((slug) => slug !== "settings", {
    message: '"settings" is reserved for the account settings page.',
  });

function selectedNames(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseRecordIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("allowedRecordIds")
        .flatMap((value) => String(value).split(/[\s,]+/))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function portalViewFields(formData: FormData, object: TwentyObjectMetadata) {
  return {
    columns: fieldConfigsFromNames(
      selectedNames(formData, "columns"),
      object.fields,
    ),
    detailFields: fieldConfigsFromNames(
      selectedNames(formData, "detailFields"),
      object.fields,
    ),
    filterFields: filterConfigsFromNames(
      selectedNames(formData, "filterFields"),
      object.fields,
    ),
    createFields: fieldConfigsFromNames(
      selectedNames(formData, "createFields"),
      object.fields,
    ),
    editFields: fieldConfigsFromNames(
      selectedNames(formData, "editFields"),
      object.fields,
    ),
  };
}

export async function testConnectionAction() {
  const current = await requireAdmin();
  const requestId = randomUUID();
  try {
    await testTwentyConnection();
    await writeAuditEvent({
      actorUserId: current.user.id,
      action: "twenty.connection_tested",
      status: "success",
      requestId,
    });
    return { ok: true, message: "Twenty connection succeeded." };
  } catch (error) {
    await writeAuditEvent({
      actorUserId: current.user.id,
      action: "twenty.connection_tested",
      status: "failure",
      requestId,
      metadata: { error: error instanceof Error ? error.message : "Unknown" },
    });
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Connection failed.",
    };
  }
}

export async function listShareableRecordsAction(objectNameSingular: string) {
  await requireAdmin();
  const [latest] = await db
    .select()
    .from(metadataSnapshots)
    .orderBy(desc(metadataSnapshots.syncedAt))
    .limit(1);
  const object = latest?.objects.find(
    (item) => item.nameSingular === objectNameSingular,
  );
  if (!object) return [];

  const displayField =
    object.fields.find((field) =>
      ["name", "title", "label", "email"].includes(field.name),
    ) ??
    object.fields.find((field) =>
      ["TEXT", "FULL_NAME"].includes(field.type),
    );
  const fields = displayField
    ? [{ name: displayField.name, label: displayField.label }]
    : [];
  const result = await listTwentyRecords({
    objectNamePlural: object.namePlural,
    fields,
    metadataFields: object.fields,
    filter: {},
  });

  return result.edges.map(({ node }) => {
    const value = displayField ? node[displayField.name] : null;
    const label =
      value && typeof value === "object"
        ? Object.values(value as Record<string, unknown>)
            .filter(Boolean)
            .join(" ")
        : String(value ?? node.id);
    return { id: String(node.id), label };
  });
}

export async function syncMetadataAction() {
  const current = await requireAdmin();
  const objects = await fetchTwentyMetadata();
  await db.insert(metadataSnapshots).values({
    objects,
    syncedByUserId: current.user.id,
  });

  const views = await db.select().from(portalViews);
  for (const view of views) {
    const fieldNames = [
      ...view.columns,
      ...view.detailFields,
      ...view.createFields,
      ...view.editFields,
      ...view.filterFields,
    ].map((field) => field.name);
    const errors = validatePortalViewConfiguration({
      objectNameSingular: view.objectNameSingular,
      scopeFieldName: view.scopeFieldName,
      scopeMode: view.scopeMode,
      fieldNames,
      objects,
    });
    await db
      .update(portalViews)
      .set({
        validationErrors: errors,
        isEnabled: errors.length === 0 && view.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(portalViews.id, view.id));
  }

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "metadata.synced",
    status: "success",
    metadata: { objectCount: objects.length },
  });
  revalidatePath("/admin");
  revalidatePath("/portal");
}

export async function createClientAccountAction(formData: FormData) {
  const current = await requireAdmin();
  const input = z
    .object({
      name: z.string().trim().min(2),
      twentyCompanyId: z.string().uuid(),
    })
    .parse(Object.fromEntries(formData));

  const [created] = await db
    .insert(clientAccounts)
    .values(input)
    .returning({ id: clientAccounts.id });
  await writeAuditEvent({
    actorUserId: current.user.id,
    clientAccountId: created.id,
    action: "client.created",
    status: "success",
    after: input,
  });
  revalidatePath("/admin/clients");
}

export async function createPortalViewAction(formData: FormData) {
  const current = await requireAdmin();
  const scalar = z
    .object({
      slug: portalViewSlugSchema,
      label: z.string().trim().min(2),
      objectNameSingular: z.string().trim().min(1),
      scopeMode: z.enum(["company", "records"]),
      scopeFieldName: z.string().trim().optional().default(""),
      defaultSortField: z.string().trim().optional(),
      defaultSortDirection: z.enum(["asc", "desc"]).default("asc"),
      navigationOrder: z.coerce.number().int().default(0),
    })
    .parse(Object.fromEntries(formData));

  const [latest] = await db
    .select()
    .from(metadataSnapshots)
    .orderBy(desc(metadataSnapshots.syncedAt))
    .limit(1);
  const object = latest?.objects.find(
    (item) => item.nameSingular === scalar.objectNameSingular,
  );
  if (!object) {
    throw new Error(
      "The selected Twenty object is unavailable. Synchronize metadata and try again.",
    );
  }
  const fields = portalViewFields(formData, object);
  const allowedRecordIds = parseRecordIds(formData);
  if (scalar.scopeMode === "records" && !allowedRecordIds.length) {
    throw new Error("Add at least one Twenty record ID.");
  }
  const validationErrors = validatePortalViewConfiguration({
    objectNameSingular: scalar.objectNameSingular,
    scopeFieldName: scalar.scopeFieldName,
    scopeMode: scalar.scopeMode,
    fieldNames: [
      ...fields.columns,
      ...fields.detailFields,
      ...fields.createFields,
      ...fields.editFields,
      ...fields.filterFields,
    ].map((field) => field.name),
    objects: latest?.objects ?? [],
  });
  if (
    scalar.defaultSortField &&
    !object.fields.some((field) => field.name === scalar.defaultSortField)
  ) {
    validationErrors.push("The default sort field does not exist.");
  }

  const [created] = await db
    .insert(portalViews)
    .values({
      ...scalar,
      objectNamePlural: object.namePlural,
      allowedRecordIds,
      defaultSortField: scalar.defaultSortField || null,
      ...fields,
      validationErrors,
      isEnabled: validationErrors.length === 0,
    })
    .returning({ id: portalViews.id });
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "view.created",
    status: "success",
    recordId: created.id,
    after: {
      ...scalar,
      objectNamePlural: object.namePlural,
      allowedRecordIds,
      ...fields,
    },
  });
  revalidatePath("/admin/views");
  revalidatePath("/portal");
}

export async function updatePortalViewAction(
  viewId: string,
  formData: FormData,
) {
  const current = await requireAdmin();
  const existing = await db.query.portalViews.findFirst({
    where: eq(portalViews.id, viewId),
  });
  if (!existing) throw new Error("Portal view not found.");

  const scalar = z
    .object({
      slug: portalViewSlugSchema,
      label: z.string().trim().min(2),
      objectNameSingular: z.string().trim().min(1),
      scopeMode: z.enum(["company", "records"]),
      scopeFieldName: z.string().trim().optional().default(""),
      defaultSortField: z.string().trim().optional(),
      defaultSortDirection: z.enum(["asc", "desc"]).default("asc"),
      navigationOrder: z.coerce.number().int().default(0),
    })
    .parse(Object.fromEntries(formData));
  const [latest] = await db
    .select()
    .from(metadataSnapshots)
    .orderBy(desc(metadataSnapshots.syncedAt))
    .limit(1);
  const object = latest?.objects.find(
    (item) => item.nameSingular === scalar.objectNameSingular,
  );
  if (!object) {
    throw new Error(
      "The selected Twenty object is unavailable. Synchronize metadata and try again.",
    );
  }
  const fields = portalViewFields(formData, object);
  const allowedRecordIds = parseRecordIds(formData);
  if (scalar.scopeMode === "records" && !allowedRecordIds.length) {
    throw new Error("Add at least one Twenty record ID.");
  }
  const validationErrors = validatePortalViewConfiguration({
    objectNameSingular: scalar.objectNameSingular,
    scopeFieldName: scalar.scopeFieldName,
    scopeMode: scalar.scopeMode,
    fieldNames: [
      ...fields.columns,
      ...fields.detailFields,
      ...fields.createFields,
      ...fields.editFields,
      ...fields.filterFields,
    ].map((field) => field.name),
    objects: latest?.objects ?? [],
  });
  if (
    scalar.defaultSortField &&
    !object.fields.some((field) => field.name === scalar.defaultSortField)
  ) {
    validationErrors.push("The default sort field does not exist.");
  }
  const after = {
    ...scalar,
    objectNamePlural: object.namePlural,
    allowedRecordIds,
    defaultSortField: scalar.defaultSortField || null,
    ...fields,
    validationErrors,
    isEnabled: validationErrors.length === 0,
    updatedAt: new Date(),
  };
  await db.update(portalViews).set(after).where(eq(portalViews.id, viewId));
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "view.updated",
    status: "success",
    recordId: viewId,
    before: existing,
    after,
  });
  revalidatePath("/admin/views");
  revalidatePath(`/admin/views/${viewId}`);
  revalidatePath("/portal");
}

export async function createInvitationAction(
  _previous: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  try {
    const current = await requireAdmin();
    const input = z
      .object({
        name: z.string().trim().min(2),
        email: z.email(),
        role: z.enum(["admin", "viewer", "contributor"]),
        portalViewId: z.string().uuid().optional().or(z.literal("")),
      })
      .parse(Object.fromEntries(formData));
    if (input.role !== "admin" && !input.portalViewId) {
      return { error: "Choose the portal this person can access." };
    }

    const token = createOpaqueToken();
    await db.insert(invitations).values({
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      portalViewId: input.portalViewId || null,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedByUserId: current.user.id,
    });
    const inviteUrl = `${getEnv().APP_URL}/invite/${token}`;
    await sendEmail({
      to: input.email,
      subject: "You are invited to the Twenty Client Portal",
      text: `Accept your invitation: ${inviteUrl}`,
      html: `<p>You have been invited to the Twenty Client Portal.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
    });
    await writeAuditEvent({
      actorUserId: current.user.id,
      action: "invitation.created",
      status: "success",
      metadata: {
        email: input.email,
        role: input.role,
        portalViewId: input.portalViewId || null,
      },
    });
    revalidatePath("/admin/invitations");
    return { inviteUrl };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create invitation.",
    };
  }
}

export type InvitationActionState = {
  error?: string;
  inviteUrl?: string;
};
