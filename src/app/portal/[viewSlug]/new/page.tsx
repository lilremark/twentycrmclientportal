import { notFound } from "next/navigation";

import { createRecordAction } from "@/app/actions/portal";
import { RecordForm } from "@/components/record-form";
import { requirePortalContext } from "@/lib/access";
import {
  getLatestMetadata,
  getObjectMetadata,
  getPortalView,
} from "@/lib/portal";

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ viewSlug: string }>;
}) {
  const { viewSlug } = await params;
  const [context, view, metadata] = await Promise.all([
    requirePortalContext(),
    getPortalView(viewSlug),
    getLatestMetadata(),
  ]);
  if (
    context.role !== "contributor" ||
    !view?.isEnabled ||
    !view.createFields.length
  ) {
    notFound();
  }
  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-5 text-2xl font-bold">Add {object.labelSingular}</h2>
      <RecordForm
        action={createRecordAction.bind(null, view.slug)}
        fields={view.createFields}
        metadataFields={object.fields}
        submitLabel="Create record"
      />
    </div>
  );
}
