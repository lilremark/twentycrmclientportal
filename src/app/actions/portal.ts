"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { requirePortalViewContext } from "@/lib/access";
import { writeAuditEvent } from "@/lib/audit";
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
  if (view.scopeMode === "records") {
    throw new Error(
      "New records cannot be created in a specific-record portal.",
    );
  }
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
    let scopedData = data;
    if (view.scopeMode === "person") {
      if (!context.twentyPersonId) {
        throw new Error("This portal requires a client Person.");
      }
      const scopeField = metadata.fields.find(
        (field) => field.name === view.scopeFieldName,
      );
      if (scopeField?.type === "RELATION") {
        throw new Error(
          "Creating Person-scoped records requires a Person ID field such as personId.",
        );
      }
      scopedData = {
        ...data,
        [view.scopeFieldName]: context.twentyPersonId,
      };
    }
    after = await writeTwentyRecord({
      operation: "create",
      objectNameSingular: view.objectNameSingular,
      data: scopedData,
      fields: view.detailFields,
      metadataFields: metadata.fields,
    });
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
  redirect(`/portal/${slug}/${recordId}`);
}
