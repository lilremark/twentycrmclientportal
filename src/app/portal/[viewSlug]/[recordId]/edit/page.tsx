import { notFound } from "next/navigation";

import { updateRecordAction } from "@/app/actions/portal";
import { RecordForm } from "@/components/record-form";
import { requirePortalViewContext } from "@/lib/access";
import {
  getLatestMetadata,
  getObjectMetadata,
} from "@/lib/portal";
import { getTwentyRecord } from "@/lib/twenty/client";
import { buildPortalScopeFilter } from "@/lib/twenty/filters";

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
  const record = await getTwentyRecord({
    objectNameSingular: view.objectNameSingular,
    fields: view.editFields,
    metadataFields: object.fields,
    filter: {
      and: [
        { id: { eq: recordId } },
        buildPortalScopeFilter({
          scopeMode: view.scopeMode,
          scopeFieldName: view.scopeFieldName,
          allowedRecordIds: view.allowedRecordIds,
          twentyCompanyId: context.twentyCompanyId,
          metadataFields: object.fields,
        }),
      ],
    },
  });
  if (!record) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-5 text-2xl font-bold">Edit {object.labelSingular}</h2>
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
