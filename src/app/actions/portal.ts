"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { requirePortalContext } from "@/lib/access";
import { writeAuditEvent } from "@/lib/audit";
import { getLatestMetadata, getObjectMetadata, getPortalView } from "@/lib/portal";
import { enforceWriteRateLimit } from "@/lib/rate-limit";
import {
  getTwentyRecord,
  writeTwentyRecord,
} from "@/lib/twenty/client";
import { validateRecordInput } from "@/lib/twenty/validation";

async function getWriteContext(slug: string) {
  const context = await requirePortalContext();
  if (context.role !== "contributor") {
    throw new Error("Your role does not permit changes.");
  }
  const view = await getPortalView(slug);
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
    const scopedData = {
      ...data,
      [view.scopeFieldName]: context.twentyCompanyId,
    };
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
        { [view.scopeFieldName]: { eq: context.twentyCompanyId } },
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
