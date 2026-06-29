"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requirePortalViewContext, requireSession } from "@/lib/access";
import { writeAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  portalSavedViews,
  portalViews,
  type TwentyFieldMetadata,
} from "@/lib/db/schema";
import { extractPortalFiles } from "@/lib/file-values";
import { noteBelongsToRecord } from "@/lib/portal-notes";
import { getLatestMetadata, getObjectMetadata } from "@/lib/portal";
import { enforceWriteRateLimit } from "@/lib/rate-limit";
import {
  deleteTwentyRecord,
  getTwentyRecord,
  listTwentyRecords,
  uploadTwentyFilesFieldFile,
  writeTwentyRecord,
} from "@/lib/twenty/client";
import { clearTwentyReadCache } from "@/lib/twenty/cache";
import {
  buildPortalScopeFilter,
  buildScopedFilter,
  type PortalFilterInput,
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
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export type PortalRecordPage = {
  records: Array<Record<string, unknown> & { id: string }>;
  endCursor: string | null;
  hasNextPage: boolean;
};

export async function loadMorePortalRecordsAction(
  viewSlug: string,
  requestedFilters: PortalFilterInput[],
  requestedSortField: string | null,
  requestedSortDirection: "asc" | "desc",
  cursor: string,
): Promise<PortalRecordPage> {
  const [context, metadata] = await Promise.all([
    requirePortalViewContext(viewSlug),
    getLatestMetadata(),
  ]);
  const view = context.view;
  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) throw new Error("The portal metadata is unavailable.");

  const filter = buildScopedFilter({
    scopeFilter: buildPortalScopeFilter({
      scopeMode: view.scopeMode,
      scopeFieldName: view.scopeFieldName,
      allowedRecordIds: view.allowedRecordIds,
      twentyPersonId: context.twentyPersonId,
      metadataFields: object.fields,
    }),
    fixedFilters: view.fixedFilters,
    metadataFields: object.fields,
    configuredFilters: view.filterFields,
    requestedFilters,
  });
  const allowedSortFields = new Set(view.columns.map((field) => field.name));
  const sortField =
    requestedSortField && allowedSortFields.has(requestedSortField)
      ? requestedSortField
      : view.defaultSortField;
  const sortDirection =
    requestedSortField && allowedSortFields.has(requestedSortField)
      ? requestedSortDirection
      : view.defaultSortDirection;
  const orderBy = sortField
    ? {
        [sortField]: gqlEnum(
          sortDirection === "desc"
            ? "DescNullsLast"
            : "AscNullsLast",
        ),
      }
    : undefined;
  const result = await listTwentyRecords({
    objectNamePlural: view.objectNamePlural,
    fields: view.columns,
    metadataFields: object.fields,
    filter,
    orderBy,
    cursor,
  });

  return {
    records: result.edges.map(
      ({ node }) => node as Record<string, unknown> & { id: string },
    ),
    endCursor: result.pageInfo.endCursor ?? null,
    hasNextPage: result.pageInfo.hasNextPage,
  };
}

const savedViewSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function savePortalFilterViewAction(
  slug: string,
  returnQuery: string,
  formData: FormData,
) {
  const context = await requirePortalViewContext(slug);
  const parsed = savedViewSchema.parse({ name: formData.get("name") });
  const query = new URLSearchParams(returnQuery);
  const filters = context.view.filterFields
    .map((config) => ({
      field: config.name,
      operator: String(query.get(`op_${config.name}`) ?? ""),
      value: String(query.get(`f_${config.name}`) ?? "").trim(),
    }))
    .filter((filter) => filter.value)
    .map((filter) => {
      const config = context.view.filterFields.find(
        (item) => item.name === filter.field,
      );
      const operator = config?.operators.includes(filter.operator)
        ? filter.operator
        : config?.operators[0] ?? "eq";
      return { ...filter, operator };
    });
  const allowedSortFields = new Set(
    context.view.columns.map((field) => field.name),
  );
  const requestedSortField = query.get("sort");
  const sortField =
    requestedSortField && allowedSortFields.has(requestedSortField)
      ? requestedSortField
      : null;
  const sortDirection = query.get("direction") === "desc" ? "desc" : "asc";

  const [saved] = await db
    .insert(portalSavedViews)
    .values({
      userId: context.session.user.id,
      portalViewId: context.view.id,
      name: parsed.name,
      filters,
      sortField,
      sortDirection,
    })
    .onConflictDoUpdate({
      target: [
        portalSavedViews.userId,
        portalSavedViews.portalViewId,
        portalSavedViews.name,
      ],
      set: {
        filters,
        sortField,
        sortDirection,
        updatedAt: new Date(),
      },
    })
    .returning({ id: portalSavedViews.id });

  if (!saved) throw new Error("The saved view could not be created.");
  redirect(`/portal/${slug}?saved=${saved.id}`);
}

export async function deletePortalFilterViewAction(
  slug: string,
  savedViewId: string,
) {
  const context = await requirePortalViewContext(slug);
  await db
    .delete(portalSavedViews)
    .where(
      and(
        eq(portalSavedViews.id, savedViewId),
        eq(portalSavedViews.userId, context.session.user.id),
        eq(portalSavedViews.portalViewId, context.view.id),
      ),
    );
  redirect(`/portal/${slug}`);
}

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
      blocknote: JSON.stringify([]),
    },
  };
}

function sanitizedFileName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 120) || "attachment"
  );
}

function detectedMimeType(bytes: Uint8Array, fallback: string) {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (startsWith(0x50, 0x4b, 0x03, 0x04)) {
    return fallback || "application/zip";
  }
  if (fallback.startsWith("text/")) return fallback;
  return fallback || "application/octet-stream";
}

async function validatedAttachment(formData: FormData) {
  const value = formData.get("attachment");
  if (!(value instanceof File) || value.size === 0) {
    throw new Error("Choose a file to upload.");
  }
  if (value.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Files must be 20 MB or smaller.");
  }

  const bytes = new Uint8Array(await value.arrayBuffer());
  const mimeType = detectedMimeType(bytes.slice(0, 16), value.type);
  return new File([bytes], sanitizedFileName(value.name), { type: mimeType });
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
  redirect(`/portal/${slug}?record=${encodeURIComponent(String(after.id))}`);
}

export async function refreshPortalDataAction() {
  await requireSession();
  clearTwentyReadCache();
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
      key === "saved" ||
      key === "sort" ||
      key === "direction" ||
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

export async function uploadRecordAttachmentAction(
  slug: string,
  recordId: string,
  returnQuery: string,
  formData: FormData,
) {
  const { context, view, metadata } = await getWriteContext(slug);
  const latestMetadata = await getLatestMetadata();
  const attachmentObject = getObjectMetadata(latestMetadata, "attachment");
  const attachmentFileField = attachmentObject?.fields.find(
    (field) => field.name === "file",
  );
  if (!attachmentObject || !attachmentFileField) {
    throw new Error("Twenty attachment metadata is unavailable.");
  }

  const record = await getTwentyRecord({
    objectNameSingular: view.objectNameSingular,
    fields: [],
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

  enforceWriteRateLimit(context.session.user.id);
  const requestId = randomUUID();
  try {
    const file = await validatedAttachment(formData);
    const fileId = await uploadTwentyFilesFieldFile({
      file,
      fieldMetadataId: attachmentFileField.id,
    });
    const targetFieldName = `target${
      view.objectNameSingular.charAt(0).toUpperCase() +
      view.objectNameSingular.slice(1)
    }Id`;
    const after = await writeTwentyRecord({
      operation: "create",
      objectNameSingular: "attachment",
      data: {
        name: file.name,
        [targetFieldName]: recordId,
        file: [{ fileId, label: file.name }],
      },
      fields: [
        { name: "name", label: "Name" },
        { name: "file", label: "File" },
      ],
      metadataFields: attachmentObject.fields,
    });
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "attachment.created",
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
      action: "attachment.created",
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

export async function deleteRecordAttachmentAction(
  slug: string,
  recordId: string,
  returnQuery: string,
  attachmentId: string,
) {
  const { context, view, metadata } = await getWriteContext(slug);
  const attachmentsField = metadata.fields.find(
    (field) =>
      field.name === "attachments" &&
      field.relationTargetObjectNameSingular === "attachment",
  );
  if (!attachmentsField) {
    throw new Error("Attachments are not available for this portal object.");
  }

  const record = await getTwentyRecord({
    objectNameSingular: view.objectNameSingular,
    fields: [{ name: attachmentsField.name, label: "Attachments" }],
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
  const attachmentIds = new Set(
    extractPortalFiles(record?.[attachmentsField.name])
      .map((file) => file.attachmentId)
      .filter((id): id is string => Boolean(id)),
  );
  if (!record || !attachmentIds.has(attachmentId)) {
    throw new Error("Attachment not found.");
  }

  enforceWriteRateLimit(context.session.user.id);
  const requestId = randomUUID();
  try {
    await deleteTwentyRecord({
      objectNamePlural: "attachments",
      recordId: attachmentId,
    });
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "attachment.deleted",
      objectName: view.objectNameSingular,
      recordId,
      status: "success",
      requestId,
      before: { attachmentId },
    });
  } catch (error) {
    await writeAuditEvent({
      actorUserId: context.session.user.id,
      clientAccountId: context.clientAccountId,
      action: "attachment.deleted",
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
