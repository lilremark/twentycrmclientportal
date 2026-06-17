"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePortalViewContext } from "@/lib/access";
import { writeAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { portalViews, type TwentyFieldMetadata } from "@/lib/db/schema";
import { noteBelongsToRecord } from "@/lib/portal-notes";
import { getLatestMetadata, getObjectMetadata } from "@/lib/portal";
import { enforceWriteRateLimit } from "@/lib/rate-limit";
import {
  getTwentyRecord,
  writeTwentyRecord,
} from "@/lib/twenty/client";
import {
  buildPortalScopeFilter,
  buildScopedFilter,
} from "@/lib/twenty/filters";
import { validateRecordInput } from "@/lib/twenty/validation";
import { gqlEnum } from "@/lib/twenty/graphql";

function writeFieldName(field: TwentyFieldMetadata) {
  return field.type === "RELATION" ? `${field.name}Id` : field.name;
}

function coerceFixedWriteValue(field: TwentyFieldMetadata, value: string) {
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (field.type === "MULTI_SELECT") {
    return values.map(gqlEnum);
  }
  if (field.type === "SELECT") {
    return gqlEnum(values[0] ?? value);
  }
  if (field.type === "BOOLEAN") {
    return value === "true";
  }
  if (field.type === "NUMBER" || field.type === "NUMERIC") {
    return Number(value);
  }
  if (field.type === "RELATION") {
    return values[0] ?? value;
  }
  return values.length > 1 ? values : (values[0] ?? value);
}

function buildCreateFixedFilterData(input: {
  data: Record<string, unknown>;
  fixedFilters: Array<{ name: string; operator: string; value: string }>;
  metadataFields: TwentyFieldMetadata[];
}) {
  const metadataByName = new Map(
    input.metadataFields.map((field) => [field.name, field]),
  );
  const data = { ...input.data };

  for (const filter of input.fixedFilters) {
    if (!["eq", "is", "in", "containsAny"].includes(filter.operator)) {
      continue;
    }
    const field = metadataByName.get(filter.name);
    if (!field || field.relationType === "ONE_TO_MANY") continue;
    const targetName = writeFieldName(field);
    if (data[targetName] !== undefined && data[targetName] !== "") continue;
    data[targetName] = coerceFixedWriteValue(field, filter.value);
  }

  return data;
}

function buildPersonScopeWriteData(input: {
  view: { scopeFieldName: string };
  twentyPersonId: string | null;
  metadataFields: TwentyFieldMetadata[];
}) {
  if (!input.twentyPersonId) {
    throw new Error("This portal requires a client Person.");
  }
  const scopeField = input.metadataFields.find(
    (field) => field.name === input.view.scopeFieldName,
  );
  if (!scopeField) {
    throw new Error("This portal has an invalid Person scope field.");
  }
  return {
    [writeFieldName(scopeField)]: input.twentyPersonId,
  };
}

const noteFields = [
  { name: "title", label: "Title" },
  { name: "bodyV2", label: "Body" },
];

const noteTargetFields = [{ name: "note", label: "Note" }];

function noteTargetFieldName(objectNameSingular: string) {
  return `target${
    objectNameSingular.charAt(0).toUpperCase() +
    objectNameSingular.slice(1)
  }Id`;
}

function notePayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title) throw new Error("Add a note title.");
  return {
    title,
    bodyV2: {
      markdown: body,
      blocknote: body,
    },
  };
}

async function getNoteWriteContext(slug: string, recordId: string) {
  const { context, view, metadata } = await getWriteContext(slug);
  const latestMetadata = await getLatestMetadata();
  const noteObject = getObjectMetadata(latestMetadata, "note");
  const noteTargetObject = getObjectMetadata(latestMetadata, "noteTarget");
  const noteTargetsField = metadata.fields.find(
    (field) => field.name === "noteTargets",
  );
  if (!noteObject || !noteTargetObject || !noteTargetsField) {
    throw new Error("Notes are not available for this portal object.");
  }
  const record = await getTwentyRecord({
    objectNameSingular: view.objectNameSingular,
    fields: [{ name: "noteTargets", label: "Notes" }],
    metadataFields: metadata.fields,
    filter: {
      and: [
        { id: { eq: recordId } },
        buildScopedFilter({
          scopeFilter: buildPortalScopeFilter({
            scopeMode: view.scopeMode,
            scopeFieldName: view.scopeFieldName,
            allowedRecordIds: view.allowedRecordIds,
            twentyPersonId: context.twentyPersonId,
            metadataFields: metadata.fields,
          }),
          fixedFilters: view.fixedFilters,
          metadataFields: metadata.fields,
          configuredFilters: [],
          requestedFilters: [],
        }),
      ],
    },
  });
  if (!record) throw new Error("Record not found.");
  return { context, view, noteObject, noteTargetObject, record };
}

async function getWriteContext(slug: string) {
  const context = await requirePortalViewContext(slug);
  if (context.role !== "contributor") {
    throw new Error("Your role does not permit changes.");
  }
  const view = context.view;
  if (!view?.isEnabled || view.validationErrors.length > 0) {
    throw new Error("This portal view is unavailable.");
  }
  const metadata = getObjectMetadata(
    await getLatestMetadata(),
    view.objectNameSingular,
  );
  if (!metadata) throw new Error("Twenty metadata is not synchronized.");
  return { context, view, metadata };
}

export async function createRecordAction(slug: string, formData: FormData) {
  const { context, view, metadata } = await getWriteContext(slug);
  enforceWriteRateLimit(context.session.user.id);
  const requestId = randomUUID();
  let after: Record<string, unknown> | undefined;
  try {
    const data = validateRecordInput({
      formData,
      configuredFields: view.createFields,
      metadataFields: metadata.fields,
      scopeFieldName: view.scopeFieldName,
    });
    let scopedData = buildCreateFixedFilterData({
      data,
      fixedFilters: view.fixedFilters,
      metadataFields: metadata.fields,
    });
    if (view.scopeMode === "person") {
      scopedData = {
        ...scopedData,
        ...buildPersonScopeWriteData({
          view,
          twentyPersonId: context.twentyPersonId,
          metadataFields: metadata.fields,
        }),
      };
    }
    after = await writeTwentyRecord({
      operation: "create",
      objectNameSingular: view.objectNameSingular,
      data: scopedData,
      fields: view.detailFields,
      metadataFields: metadata.fields,
    });
    if (view.scopeMode === "records") {
      await db
        .update(portalViews)
        .set({
          allowedRecordIds: [
            ...new Set([...view.allowedRecordIds, String(after.id)]),
          ],
          updatedAt: new Date(),
        })
        .where(eq(portalViews.id, view.id));
    }
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "record.created",
      objectName: view.objectNameSingular,
      recordId: String(after.id),
      status: "success",
      requestId,
      after,
    });
  } catch (error) {
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "record.created",
      objectName: view.objectNameSingular,
      status: "failure",
      requestId,
      metadata: { error: error instanceof Error ? error.message : "Unknown" },
    });
    throw error;
  }
  redirect(`/portal/${slug}/${after.id}`);
}

export async function updateRecordAction(
  slug: string,
  recordId: string,
  formData: FormData,
) {
  await updateRecord(slug, recordId, formData);
  redirect(`/portal/${slug}/${recordId}`);
}

function recordPanelReturnHref(
  slug: string,
  recordId: string,
  returnQuery: string,
) {
  const requested = new URLSearchParams(returnQuery);
  const safe = new URLSearchParams();

  for (const [key, value] of requested) {
    if (
      key === "cursor" ||
      key.startsWith("f_") ||
      key.startsWith("op_")
    ) {
      safe.append(key, value);
    }
  }
  safe.set("record", recordId);
  return `/portal/${slug}?${safe.toString()}`;
}

export async function updateRecordPanelAction(
  slug: string,
  recordId: string,
  returnQuery: string,
  formData: FormData,
) {
  await updateRecord(slug, recordId, formData);
  redirect(recordPanelReturnHref(slug, recordId, returnQuery));
}

export async function createNoteAction(
  slug: string,
  recordId: string,
  returnQuery: string,
  formData: FormData,
) {
  const { context, view, noteObject, noteTargetObject } =
    await getNoteWriteContext(slug, recordId);
  enforceWriteRateLimit(context.session.user.id);
  const requestId = randomUUID();
  let note: Record<string, unknown> | undefined;
  try {
    note = await writeTwentyRecord({
      operation: "create",
      objectNameSingular: "note",
      data: notePayload(formData),
      fields: noteFields,
      metadataFields: noteObject.fields,
    });
    await writeTwentyRecord({
      operation: "create",
      objectNameSingular: "noteTarget",
      data: {
        noteId: String(note.id),
        [noteTargetFieldName(view.objectNameSingular)]: recordId,
      },
      fields: noteTargetFields,
      metadataFields: noteTargetObject.fields,
    });
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "note.created",
      objectName: view.objectNameSingular,
      recordId,
      status: "success",
      requestId,
      after: note,
    });
  } catch (error) {
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "note.created",
      objectName: view.objectNameSingular,
      recordId,
      status: "failure",
      requestId,
      metadata: { error: error instanceof Error ? error.message : "Unknown" },
    });
    throw error;
  }
  revalidatePath(`/portal/${slug}`);
  redirect(recordPanelReturnHref(slug, recordId, returnQuery));
}

export async function updateNoteAction(
  slug: string,
  recordId: string,
  returnQuery: string,
  noteId: string,
  formData: FormData,
) {
  const { context, view, noteObject, record } = await getNoteWriteContext(
    slug,
    recordId,
  );
  if (!noteBelongsToRecord(record, noteId)) {
    throw new Error("Note not found.");
  }
  enforceWriteRateLimit(context.session.user.id);
  const requestId = randomUUID();
  try {
    const after = await writeTwentyRecord({
      operation: "update",
      objectNameSingular: "note",
      id: noteId,
      data: notePayload(formData),
      fields: noteFields,
      metadataFields: noteObject.fields,
    });
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "note.updated",
      objectName: view.objectNameSingular,
      recordId,
      status: "success",
      requestId,
      after,
    });
  } catch (error) {
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "note.updated",
      objectName: view.objectNameSingular,
      recordId,
      status: "failure",
      requestId,
      metadata: { error: error instanceof Error ? error.message : "Unknown" },
    });
    throw error;
  }
  revalidatePath(`/portal/${slug}`);
  redirect(recordPanelReturnHref(slug, recordId, returnQuery));
}

async function updateRecord(
  slug: string,
  recordId: string,
  formData: FormData,
) {
  const { context, view, metadata } = await getWriteContext(slug);
  enforceWriteRateLimit(context.session.user.id);
  const requestId = randomUUID();
  const before = await getTwentyRecord({
    objectNameSingular: view.objectNameSingular,
    fields: view.detailFields,
    metadataFields: metadata.fields,
    filter: {
      and: [
        { id: { eq: recordId } },
        buildScopedFilter({
          scopeFilter: buildPortalScopeFilter({
            scopeMode: view.scopeMode,
            scopeFieldName: view.scopeFieldName,
            allowedRecordIds: view.allowedRecordIds,
            twentyPersonId: context.twentyPersonId,
            metadataFields: metadata.fields,
          }),
          fixedFilters: view.fixedFilters,
          metadataFields: metadata.fields,
          configuredFilters: [],
          requestedFilters: [],
        }),
      ],
    },
  });
  if (!before) throw new Error("Record not found.");

  try {
    const data = validateRecordInput({
      formData,
      configuredFields: view.editFields,
      metadataFields: metadata.fields,
      scopeFieldName: view.scopeFieldName,
    });
    const after = await writeTwentyRecord({
      operation: "update",
      objectNameSingular: view.objectNameSingular,
      id: recordId,
      data,
      fields: view.detailFields,
      metadataFields: metadata.fields,
    });
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "record.updated",
      objectName: view.objectNameSingular,
      recordId,
      status: "success",
      requestId,
      before,
      after,
    });
  } catch (error) {
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "record.updated",
      objectName: view.objectNameSingular,
      recordId,
      status: "failure",
      requestId,
      before,
      metadata: { error: error instanceof Error ? error.message : "Unknown" },
    });
    throw error;
  }
}
