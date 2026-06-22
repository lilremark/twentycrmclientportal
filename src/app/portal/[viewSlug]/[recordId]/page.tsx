import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePortalViewContext } from "@/lib/access";
import {
  displayValue,
  getLatestMetadata,
  getObjectMetadata,
} from "@/lib/portal";
import { getScopedPortalRecord } from "@/lib/portal-record";

export default async function RecordDetailPage({
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
  if (!view?.isEnabled) notFound();
  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) notFound();
  const record = await getScopedPortalRecord({
    objectNameSingular: view.objectNameSingular,
    fields: view.detailFields,
    metadataFields: object.fields,
    recordId,
    scopeMode: view.scopeMode,
    scopeFieldName: view.scopeFieldName,
    allowedRecordIds: view.allowedRecordIds,
    twentyPersonId: context.twentyPersonId,
    fixedFilters: view.fixedFilters,
  });
  if (!record) notFound();
  const metadataByName = new Map(
    object.fields.map((field) => [field.name, field]),
  );

  return (
    <div className="page-stack mx-auto max-w-3xl">
      <div className="page-actions justify-between">
        <Link
          className="text-sm font-semibold text-[#3157d5]"
          href={`/portal/${view.slug}`}
        >
          ← Back to {view.label}
        </Link>
        {context.role === "contributor" && view.editFields.length ? (
          <Link
            className="button"
            href={`/portal/${view.slug}/${recordId}/edit`}
          >
            Edit record
          </Link>
        ) : null}
      </div>
      <dl className="card divide-y divide-[var(--border)]">
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
            <dd>
              {displayValue(
                record[config.name],
                metadataByName.get(config.name)?.type,
                {
                  selectOptions: metadataByName.get(config.name)?.options,
                  formatSelectValues: view.formatSelectValues,
                },
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
