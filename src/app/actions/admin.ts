"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeSecureEmbedUrl } from "@/lib/embed-url";

import { requireAdmin } from "@/lib/access";
import { writeAuditEvent } from "@/lib/audit";
import { getApplicationSettings } from "@/lib/application-settings";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/credentials";
import { db } from "@/lib/db";
import {
  account,
  clientAccounts,
  invitations,
  memberships,
  metadataSnapshots,
  portalAccess,
  portalAdministrators,
  portalViews,
  session,
  type PortalDashboardWidget,
  type PortalFixedFilter,
  type TwentyObjectMetadata,
  user,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { renderInvitationEmail } from "@/lib/invitation-email";
import {
  fieldConfigsFromNames,
  fixedFilterOperatorsForType,
  filterConfigsFromNames,
  validateFixedFilters,
} from "@/lib/portal-view-config";
import { validatePortalDashboardWidgets } from "@/lib/portal-dashboard";
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

const portalNavigationIconSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z][A-Za-z0-9]*$/)
  .default("records");

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

const dashboardWidgetSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(["number", "bar", "donut", "embed"]),
  label: z.string().trim().min(1).max(80),
  aggregate: z.enum(["count", "sum", "average"]),
  field: z.string().trim().optional(),
  groupBy: z.string().trim().optional(),
  embedUrl: z.string().trim().optional(),
  layout: z
    .object({
      x: z.coerce.number().int().min(0).max(11),
      y: z.coerce.number().int().min(0).max(99),
      w: z.coerce.number().int().min(2).max(12),
      h: z.coerce.number().int().min(2).max(8),
    })
    .optional(),
});

function parseDashboardWidgets(formData: FormData): PortalDashboardWidget[] {
  return formData.getAll("dashboardWidgets").map((entry) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(entry));
    } catch {
      throw new Error("A dashboard widget is malformed.");
    }
    const widget = dashboardWidgetSchema.parse(parsed);
    const embedUrl = widget.type === "embed" ? normalizeSecureEmbedUrl(widget.embedUrl ?? "") : undefined;
    return {
      ...widget,
      field: widget.field || undefined,
      groupBy: widget.groupBy || undefined,
      embedUrl,
    };
  });
}

function dashboardFieldNames(widgets: PortalDashboardWidget[]) {
  return widgets.flatMap((widget) => [widget.field, widget.groupBy]).filter(
    (name): name is string => Boolean(name),
  );
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
      ...dashboardFieldNames(view.dashboardWidgets).map((name) => ({ name })),
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
      errors.push(
        ...validatePortalDashboardWidgets(
          view.dashboardWidgets,
          object.fields,
        ),
      );
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
  revalidatePath("/admin/invitations/clients");
  revalidatePath("/admin/invitations");
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
      formatSelectValues: z
        .union([
          z.literal("on"),
          z.literal("true"),
          z.literal("false"),
          z.null(),
        ])
        .optional()
        .transform((value) => value === "on" || value === "true"),
      navigationOrder: z.coerce.number().int().default(0),
      navigationIcon: portalNavigationIconSchema,
      navigationIconColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#3157d5"),
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
  const dashboardWidgets = parseDashboardWidgets(formData);
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
      ...dashboardFieldNames(dashboardWidgets).map((name) => ({ name })),
    ].map((field) => field.name),
    objects: latest?.objects ?? [],
  });
  validationErrors.push(
    ...validatePortalDashboardWidgets(dashboardWidgets, object.fields),
  );
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
      dashboardWidgets,
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
      dashboardWidgets,
      ...fields,
    },
  });
  revalidatePath("/admin/views");
  revalidatePath("/portal");
  redirect("/admin/views");
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
      formatSelectValues: z
        .union([
          z.literal("on"),
          z.literal("true"),
          z.literal("false"),
          z.null(),
        ])
        .optional()
        .transform((value) => value === "on" || value === "true"),
      navigationOrder: z.coerce.number().int().default(0),
      navigationIcon: portalNavigationIconSchema,
      navigationIconColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#3157d5"),
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
  const dashboardWidgets = parseDashboardWidgets(formData);
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
      ...dashboardFieldNames(dashboardWidgets).map((name) => ({ name })),
    ].map((field) => field.name),
    objects: latest?.objects ?? [],
  });
  validationErrors.push(
    ...validatePortalDashboardWidgets(dashboardWidgets, object.fields),
  );
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
    dashboardWidgets,
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

export async function setPortalViewStatusAction(
  viewId: string,
  enabled: boolean,
) {
  const current = await requireAdmin();
  const existing = await db.query.portalViews.findFirst({
    where: eq(portalViews.id, viewId),
  });
  if (!existing) throw new Error("Portal view not found.");
  if (enabled && existing.validationErrors.length) {
    throw new Error("Resolve validation errors before enabling this view.");
  }

  await db
    .update(portalViews)
    .set({ isEnabled: enabled, updatedAt: new Date() })
    .where(eq(portalViews.id, viewId));
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: enabled ? "view.enabled" : "view.suspended",
    status: "success",
    recordId: viewId,
    before: existing,
    after: { isEnabled: enabled },
  });
  revalidatePath("/admin/views");
  revalidatePath(`/admin/views/${viewId}`);
  revalidatePath("/portal");
}

export async function deletePortalViewAction(viewId: string) {
  const current = await requireAdmin();
  const existing = await db.query.portalViews.findFirst({
    where: eq(portalViews.id, viewId),
  });
  if (!existing) throw new Error("Portal view not found.");

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "view.deleted",
    status: "success",
    recordId: viewId,
    before: existing,
  });
  await db.delete(portalViews).where(eq(portalViews.id, viewId));
  revalidatePath("/admin/views");
  revalidatePath("/portal");
}

export async function setClientAccountStatusAction(
  clientAccountId: string,
  active: boolean,
) {
  const current = await requireAdmin();
  const existing = await db.query.clientAccounts.findFirst({
    where: eq(clientAccounts.id, clientAccountId),
  });
  if (!existing) throw new Error("Client account not found.");

  await db
    .update(clientAccounts)
    .set({ isActive: active, updatedAt: new Date() })
    .where(eq(clientAccounts.id, clientAccountId));
  await writeAuditEvent({
    actorUserId: current.user.id,
    clientAccountId,
    action: active ? "client.activated" : "client.suspended",
    status: "success",
    before: existing,
    after: { isActive: active },
  });
  revalidatePath("/admin/invitations");
  revalidatePath("/admin/invitations/clients");
  revalidatePath("/admin/clients");
  revalidatePath("/portal");
}

export async function deleteClientAccountAction(clientAccountId: string) {
  const current = await requireAdmin();
  const existing = await db.query.clientAccounts.findFirst({
    where: eq(clientAccounts.id, clientAccountId),
  });
  if (!existing) throw new Error("Client account not found.");

  await writeAuditEvent({
    actorUserId: current.user.id,
    clientAccountId,
    action: "client.deleted",
    status: "success",
    before: existing,
  });
  await db.delete(clientAccounts).where(eq(clientAccounts.id, clientAccountId));
  revalidatePath("/admin/invitations");
  revalidatePath("/admin/invitations/clients");
  revalidatePath("/admin/clients");
  revalidatePath("/portal");
}

export async function revokeInvitationAction(invitationId: string) {
  const current = await requireAdmin();
  const existing = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
  });
  if (!existing) throw new Error("Invitation not found.");

  await db
    .update(invitations)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(invitations.id, invitationId));
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "invitation.revoked",
    status: "success",
    recordId: invitationId,
    before: existing,
    after: { status: "revoked" },
  });
  revalidatePath("/admin/invitations");
}

export async function deleteInvitationAction(invitationId: string) {
  const current = await requireAdmin();
  const existing = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
  });
  if (!existing) throw new Error("Invitation not found.");

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "invitation.deleted",
    status: "success",
    recordId: invitationId,
    before: existing,
  });
  await db.delete(invitations).where(eq(invitations.id, invitationId));
  revalidatePath("/admin/invitations");
}

export async function setUserStatusAction(userId: string, active: boolean) {
  const current = await requireAdmin();
  if (userId === current.user.id) {
    throw new Error("You cannot suspend your own administrator account.");
  }
  const existing = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });
  if (!existing) throw new Error("User not found.");

  await db
    .update(user)
    .set({ isActive: active, updatedAt: new Date() })
    .where(eq(user.id, userId));
  if (!active) {
    await db.delete(session).where(eq(session.userId, userId));
  }
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: active ? "user.activated" : "user.suspended",
    status: "success",
    recordId: userId,
    before: existing,
    after: { isActive: active },
  });
  revalidatePath("/admin/users");
}

export async function grantUserPortalAccessAction(
  userId: string,
  formData: FormData,
) {
  const current = await requireAdmin();
  const input = z
    .object({
      portalViewId: z.string().uuid(),
      role: z.enum(["viewer", "contributor"]),
    })
    .parse(Object.fromEntries(formData));
  const [targetUser, targetView] = await Promise.all([
    db.query.user.findFirst({ where: eq(user.id, userId) }),
    db.query.portalViews.findFirst({
      where: eq(portalViews.id, input.portalViewId),
    }),
  ]);
  if (!targetUser) throw new Error("User not found.");
  if (!targetView?.isEnabled) {
    throw new Error("The selected portal is not available.");
  }

  await db
    .insert(portalAccess)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: [portalAccess.userId, portalAccess.portalViewId],
      set: { role: input.role },
    });
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "user.portal-access.granted",
    status: "success",
    recordId: userId,
    metadata: input,
  });
  revalidatePath("/admin/users");
  revalidatePath("/portal");
}

export async function revokeUserPortalAccessAction(
  userId: string,
  portalViewId: string,
) {
  const current = await requireAdmin();
  const existing = await db.query.portalAccess.findFirst({
    where: and(
      eq(portalAccess.userId, userId),
      eq(portalAccess.portalViewId, portalViewId),
    ),
  });
  if (!existing) return;

  await db
    .delete(portalAccess)
    .where(
      and(
        eq(portalAccess.userId, userId),
        eq(portalAccess.portalViewId, portalViewId),
      ),
    );
  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "user.portal-access.revoked",
    status: "success",
    recordId: userId,
    before: existing,
  });
  revalidatePath("/admin/users");
  revalidatePath("/portal");
}

export async function deleteUserAction(userId: string) {
  const current = await requireAdmin();
  if (userId === current.user.id) {
    throw new Error("You cannot delete your own administrator account.");
  }
  const existing = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });
  if (!existing) throw new Error("User not found.");

  await writeAuditEvent({
    actorUserId: current.user.id,
    action: "user.deleted",
    status: "success",
    recordId: userId,
    before: existing,
  });
  await db.delete(invitations).where(eq(invitations.invitedByUserId, userId));
  await db.delete(portalAccess).where(eq(portalAccess.userId, userId));
  await db.delete(memberships).where(eq(memberships.userId, userId));
  await db
    .delete(portalAdministrators)
    .where(eq(portalAdministrators.userId, userId));
  await db.delete(session).where(eq(session.userId, userId));
  await db.delete(account).where(eq(account.userId, userId));
  await db.delete(user).where(eq(user.id, userId));
  revalidatePath("/admin/users");
  revalidatePath("/admin/invitations");
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
    const applicationSettings = await getApplicationSettings();
    const invitationEmail = renderInvitationEmail(
      applicationSettings,
      {
        name: input.name,
        email: input.email,
        inviteUrl,
      },
      getEnv().APP_URL,
    );
    await sendEmail({
      to: input.email,
      ...invitationEmail,
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
    revalidatePath("/admin/invitations/clients");
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

export async function updateUserPortalAccessAction(
  userId: string,
  grants: { portalViewId: string; role: "viewer" | "contributor" }[],
  revokes: string[],
) {
  const current = await requireAdmin();
  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });
  if (!targetUser) throw new Error("User not found.");

  if (revokes.length) {
    for (const portalViewId of revokes) {
      await db
        .delete(portalAccess)
        .where(
          and(
            eq(portalAccess.userId, userId),
            eq(portalAccess.portalViewId, portalViewId),
          ),
        );
      await writeAuditEvent({
        actorUserId: current.user.id,
        action: "user.portal-access.revoked",
        status: "success",
        recordId: userId,
        metadata: { portalViewId },
      });
    }
  }

  for (const grant of grants) {
    const targetView = await db.query.portalViews.findFirst({
      where: eq(portalViews.id, grant.portalViewId),
    });
    if (!targetView?.isEnabled) {
      throw new Error("The selected portal is not available.");
    }
    await db
      .insert(portalAccess)
      .values({ userId, ...grant })
      .onConflictDoUpdate({
        target: [portalAccess.userId, portalAccess.portalViewId],
        set: { role: grant.role },
      });
    await writeAuditEvent({
      actorUserId: current.user.id,
      action: "user.portal-access.granted",
      status: "success",
      recordId: userId,
      metadata: grant,
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/portal");
}
