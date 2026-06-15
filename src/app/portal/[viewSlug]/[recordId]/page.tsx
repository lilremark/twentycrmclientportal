import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePortalViewContext } from "@/lib/access";
import {
  displayValue,
  getLatestMetadata,
  getObjectMetadata,
} from "@/lib/portal";
import { getTwentyRecord } from "@/lib/twenty/client";
import {
  buildPortalScopeFilter,
  buildScopedFilter,
} from "@/lib/twenty/filters";

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
  const record = await getTwentyRecord({
    objectNameSingular: view.objectNameSingular,
    fields: view.detailFields,
    metadataFields: object.fields,
    filter: {
      and: [
        { id: { eq: recordId } },
        buildScopedFilter({
          scopeFilter: buildPortalScopeFilter({
            scopeMode: view.scopeMode,
            scopeFieldName: view.scopeFieldName,
            allowedRecordIds: view.allowedRecordIds,
            twentyPersonId: context.twentyPersonId,
            metadataFields: object.fields,
          }),
          fixedFilters: view.fixedFilters,
          metadataFields: object.fields,
          configuredFilters: [],
          requestedFilters: [],
        }),
      ],
    },
  });
  if (!record) notFound();
  const metadataByName = new Map(
    object.fields.map((field) => [field.name, field]),
  );

  return (
    <div className="page-stack mx-auto max-w-3xl">
      <div className="page-heading">
        <div>
          <Link
            className="text-sm font-semibold text-[#3157d5]"
            href={`/portal/${view.slug}`}
          >
            ← Back to {view.label}
          </Link>
          <h2>{object.labelSingular}</h2>
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
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
