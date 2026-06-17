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
  type PortalFixedFilter,
  type TwentyObjectMetadata,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import {
  fieldConfigsFromNames,
  fixedFilterOperatorsForType,
  filterConfigsFromNames,
  validateFixedFilters,
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

const fixedFilterSchema = z.object({
  name: z.string().trim().min(1),
  operator: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

function parseFixedFilters(
  formData: FormData,
  object: TwentyObjectMetadata,
): PortalFixedFilter[] {
  const metadata = new Map(object.fields.map((field) => [field.name, field]));

  return formData.getAll("fixedFilters").map((entry) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(entry));
    } catch {
      throw new Error("A saved portal filter is malformed.");
    }
    const input = fixedFilterSchema.parse(parsed);
    const field = metadata.get(input.name);
    if (!field) {
      throw new Error(`Saved filter field "${input.name}" does not exist.`);
    }
    if (!fixedFilterOperatorsForType(field.type).includes(input.operator)) {
      throw new Error(
        `The saved filter operator is not valid for ${field.label}.`,
      );
    }

    const values =
      input.operator === "containsAny" || input.operator === "in"
        ? input.value
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [input.value];
    if (field.options?.length) {
      const allowed = new Set(field.options.map((option) => option.value));
      if (values.some((value) => !allowed.has(value))) {
        throw new Error(
          `A saved filter value is not valid for ${field.label}.`,
        );
      }
    }

    return {
      name: field.name,
      label: field.label,
      operator: input.operator,
      value: values.join(","),
    };
  });
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
      ...view.fixedFilters,
      ...(view.recordTitleField ? [{ name: view.recordTitleField }] : []),
    ].map((field) => field.name);
    const errors = validatePortalViewConfiguration({
      objectNameSingular: view.objectNameSingular,
      scopeFieldName: view.scopeFieldName,
      scopeMode: view.scopeMode,
      fieldNames,
      objects,
    });
    const object = objects.find(
      (item) => item.nameSingular === view.objectNameSingular,
    );
    if (object) {
      errors.push(...validateFixedFilters(view.fixedFilters, object.fields));
    }
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
      twentyPersonId: z.string().uuid(),
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
      scopeMode: z.enum(["all", "person", "records"]),
      scopeFieldName: z.string().trim().optional().default(""),
      recordTitleField: z.string().trim().optional(),
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
  if (!fields.columns.length) {
    throw new Error("Choose at least one table column.");
  }
  const fixedFilters = parseFixedFilters(formData, object);
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
      ...fixedFilters,
      ...(scalar.recordTitleField ? [{ name: scalar.recordTitleField }] : []),
    ].map((field) => field.name),
    objects: latest?.objects ?? [],
  });
  if (
    scalar.defaultSortField &&
    !object.fields.some((field) => field.name === scalar.defaultSortField)
  ) {
    validationErrors.push("The default sort field does not exist.");
  }
  if (
    scalar.recordTitleField &&
    !object.fields.some((field) => field.name === scalar.recordTitleField)
  ) {
    validationErrors.push("The record header field does not exist.");
  }

  const [created] = await db
    .insert(portalViews)
    .values({
      ...scalar,
      objectNamePlural: object.namePlural,
      allowedRecordIds,
      fixedFilters,
      recordTitleField: scalar.recordTitleField || null,
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
      fixedFilters,
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
      scopeMode: z.enum(["all", "person", "records"]),
      scopeFieldName: z.string().trim().optional().default(""),
      recordTitleField: z.string().trim().optional(),
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
  if (!fields.columns.length) {
    throw new Error("Choose at least one table column.");
  }
  const fixedFilters = parseFixedFilters(formData, object);
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
      ...fixedFilters,
      ...(scalar.recordTitleField ? [{ name: scalar.recordTitleField }] : []),
    ].map((field) => field.name),
    objects: latest?.objects ?? [],
  });
  if (
    scalar.defaultSortField &&
    !object.fields.some((field) => field.name === scalar.defaultSortField)
  ) {
    validationErrors.push("The default sort field does not exist.");
  }
  if (
    scalar.recordTitleField &&
    !object.fields.some((field) => field.name === scalar.recordTitleField)
  ) {
    validationErrors.push("The record header field does not exist.");
  }
  const after = {
    ...scalar,
    objectNamePlural: object.namePlural,
    allowedRecordIds,
    fixedFilters,
    recordTitleField: scalar.recordTitleField || null,
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
        clientAccountId: z.string().uuid().optional().or(z.literal("")),
      })
      .parse(Object.fromEntries(formData));
    if (input.role !== "admin" && !input.portalViewId) {
      return { error: "Choose the portal this person can access." };
    }
    let selectedPortal:
      | { isEnabled: boolean; scopeMode: string }
      | undefined;
    if (input.portalViewId) {
      const portal = await db.query.portalViews.findFirst({
        where: eq(portalViews.id, input.portalViewId),
      });
      selectedPortal = portal;
      if (!portal?.isEnabled) {
        return { error: "The selected portal is not currently available." };
      }
    }
    if (
      input.role !== "admin" &&
      selectedPortal?.scopeMode === "person" &&
      !input.clientAccountId
    ) {
      return {
        error:
          "Choose a client Person for Person-scoped portals, or select an All records / Specific records portal.",
      };
    }
    if (input.clientAccountId) {
      const client = await db.query.clientAccounts.findFirst({
        where: eq(clientAccounts.id, input.clientAccountId),
      });
      if (!client?.isActive) {
        return { error: "The selected client Person is not active." };
      }
    }

    const token = createOpaqueToken();
    await db.insert(invitations).values({
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      portalViewId: input.portalViewId || null,
      clientAccountId: input.clientAccountId || null,
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
        clientAccountId: input.clientAccountId || null,
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
