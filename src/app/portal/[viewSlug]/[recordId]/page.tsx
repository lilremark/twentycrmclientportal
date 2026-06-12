import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePortalContext } from "@/lib/access";
import {
  displayValue,
  getLatestMetadata,
  getObjectMetadata,
  getPortalView,
} from "@/lib/portal";
import { getTwentyRecord } from "@/lib/twenty/client";

export default async function RecordDetailPage({
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
  if (!view?.isEnabled) notFound();
  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) notFound();
  const record = await getTwentyRecord({
    objectNameSingular: view.objectNameSingular,
    fields: view.detailFields,
    metadataFields: object.fields,
    filter: {
      and: [
        { id: { eq: recordId } },
        { [view.scopeFieldName]: { eq: context.twentyCompanyId } },
      ],
    },
  });
  if (!record) notFound();
  const metadataByName = new Map(
    object.fields.map((field) => [field.name, field]),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            className="text-sm font-semibold text-[#3157d5]"
            href={`/portal/${view.slug}`}
          >
            ← Back to {view.label}
          </Link>
          <h2 className="mt-2 text-2xl font-bold">{object.labelSingular}</h2>
        </div>
        {context.role === "contributor" && view.editFields.length ? (
          <Link
            className="button"
            href={`/portal/${view.slug}/${recordId}/edit`}
          >
            Edit record
          </Link>
        ) : null}
      </div>
      <dl className="card divide-y divide-[#edf0f5]">
        {view.detailFields.map((config) => (
          <div
            className="grid gap-2 p-5 sm:grid-cols-[180px_1fr]"
            key={config.name}
          >
            <dt className="text-sm font-semibold text-[#68758a]">
              {config.label ??
                metadataByName.get(config.name)?.label ??
                config.name}
            </dt>
            <dd>{displayValue(record[config.name])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
