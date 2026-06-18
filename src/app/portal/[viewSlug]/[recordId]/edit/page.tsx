import { notFound } from "next/navigation";

import { updateRecordAction } from "@/app/actions/portal";
import { RecordForm } from "@/components/record-form";
import { requirePortalViewContext } from "@/lib/access";
import {
  getLatestMetadata,
  getObjectMetadata,
} from "@/lib/portal";
import { getScopedPortalRecord } from "@/lib/portal-record";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ viewSlug: string; recordId: string }>;
}) {
  const { viewSlug, recordId } = await params;
  const [context, metadata] = await Promise.all([
    requirePortalViewContext(viewSlug),
    getLatestMetadata(),
  ]);
  const view = context.view;
  if (
    context.role !== "contributor" ||
    !view?.isEnabled ||
    !view.editFields.length
  ) {
    notFound();
  }
  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) notFound();
  const record = await getScopedPortalRecord({
    objectNameSingular: view.objectNameSingular,
    fields: view.editFields,
    metadataFields: object.fields,
    recordId,
    scopeMode: view.scopeMode,
    scopeFieldName: view.scopeFieldName,
    allowedRecordIds: view.allowedRecordIds,
    twentyPersonId: context.twentyPersonId,
    fixedFilters: view.fixedFilters,
  });
  if (!record) notFound();

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <RecordForm
        action={updateRecordAction.bind(null, view.slug, recordId)}
        fields={view.editFields}
        metadataFields={object.fields}
        submitLabel="Save changes"
        values={record}
      />
    </div>
  );
}
