import { notFound } from "next/navigation";

import { updateRecordAction } from "@/app/actions/portal";
import { RecordForm } from "@/components/record-form";
import { requirePortalContext } from "@/lib/access";
import {
  getLatestMetadata,
  getObjectMetadata,
  getPortalView,
} from "@/lib/portal";
import { getTwentyRecord } from "@/lib/twenty/client";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ viewSlug: string; recordId: string }>;
}) {
  const { viewSlug, recordId } = await params;
  const [context, view, metadata] = await Promise.all([
    requirePortalContext(),
    getPortalView(viewSlug),
    getLatestMetadata(),
  ]);
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
        { [view.scopeFieldName]: { eq: context.twentyCompanyId } },
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
