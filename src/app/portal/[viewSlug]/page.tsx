import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalDataTable } from "@/components/portal-data-table";
import { PortalFilterForm } from "@/components/portal-filter-form";
import { requirePortalContext } from "@/lib/access";
import {
  getLatestMetadata,
  getObjectMetadata,
  getPortalView,
} from "@/lib/portal";
import { defaultFilterOperator } from "@/lib/portal-view-config";
import { listTwentyRecords, TwentyApiError } from "@/lib/twenty/client";
import {
  buildScopedFilter,
  type PortalFilterInput,
} from "@/lib/twenty/filters";
import { gqlEnum } from "@/lib/twenty/graphql";

export default async function PortalListPage({
  params,
  searchParams,
}: {
  params: Promise<{ viewSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ viewSlug }, query, context, metadata] = await Promise.all([
    params,
    searchParams,
    requirePortalContext(),
    getLatestMetadata(),
  ]);
  const view = await getPortalView(viewSlug);
  if (!view?.isEnabled || view.validationErrors.length) notFound();
  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) notFound();
  const metadataByName = new Map(
    object.fields.map((field) => [field.name, field]),
  );

  const requestedFilters: PortalFilterInput[] = view.filterFields.map(
    (config) => {
      const field = metadataByName.get(config.name);
      return {
        field: config.name,
        operator: String(
          query[`op_${config.name}`] ??
            (field ? defaultFilterOperator(field, config) : "eq"),
        ),
        value: String(query[`f_${config.name}`] ?? ""),
      };
    },
  );
  const filter = buildScopedFilter({
    scopeFieldName: view.scopeFieldName,
    twentyCompanyId: context.twentyCompanyId,
    configuredFilters: view.filterFields,
    requestedFilters,
  });
  const cursor =
    typeof query.cursor === "string" ? query.cursor : undefined;
  const orderBy = view.defaultSortField
    ? {
        [view.defaultSortField]: gqlEnum(
          view.defaultSortDirection === "desc"
            ? "DescNullsLast"
            : "AscNullsLast",
        ),
      }
    : undefined;

  let result:
    | Awaited<ReturnType<typeof listTwentyRecords>>
    | undefined;
  let error: string | undefined;
  try {
    result = await listTwentyRecords({
      objectNamePlural: view.objectNamePlural,
      fields: view.columns,
      metadataFields: object.fields,
      filter,
      orderBy,
      cursor,
    });
  } catch (caught) {
    error =
      caught instanceof TwentyApiError
        ? caught.message
        : "The records could not be loaded.";
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{view.label}</h2>
          <p className="mt-1 text-sm text-[#68758a]">
            Records are restricted to {context.clientName}.
          </p>
        </div>
        {context.role === "contributor" && view.createFields.length ? (
          <Link className="button" href={`/portal/${view.slug}/new`}>
            Add record
          </Link>
        ) : null}
      </div>
      {view.filterFields.length ? (
        <PortalFilterForm
          fields={object.fields}
          filters={view.filterFields}
          query={query}
          viewSlug={view.slug}
        />
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {result ? (
        <section className="card overflow-hidden">
          <PortalDataTable
            columns={view.columns}
            records={result.edges.map(({ node }) => node as { id: string })}
            viewSlug={view.slug}
          />
          {result.pageInfo.hasNextPage && result.pageInfo.endCursor ? (
            <div className="border-t border-[#dde3ed] p-4 text-right">
              <Link
                className="button secondary"
                href={`/portal/${view.slug}?cursor=${encodeURIComponent(
                  result.pageInfo.endCursor,
                )}`}
              >
                Next page
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
