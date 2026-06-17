import { notFound } from "next/navigation";

import { createRecordAction } from "@/app/actions/portal";
import { RecordForm } from "@/components/record-form";
import { requirePortalViewContext } from "@/lib/access";
import {
  getLatestMetadata,
  getObjectMetadata,
} from "@/lib/portal";

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ viewSlug: string }>;
}) {
  const { viewSlug } = await params;
  const [context, metadata] = await Promise.all([
    requirePortalViewContext(viewSlug),
    getLatestMetadata(),
  ]);
  const view = context.view;
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
    <div className="page-stack mx-auto max-w-2xl">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{view.label}</p>
          <h2>Add {object.labelSingular}</h2>
          <p>Create a new scoped record in Twenty CRM.</p>
        </div>
      </div>
      <RecordForm
        action={createRecordAction.bind(null, view.slug)}
        fields={view.createFields}
        metadataFields={object.fields}
        submitLabel="Create record"
      />
    </div>
  );
}
