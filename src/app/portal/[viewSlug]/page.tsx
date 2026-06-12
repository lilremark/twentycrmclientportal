import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalDataTable } from "@/components/portal-data-table";
import { requirePortalContext } from "@/lib/access";
import {
  getLatestMetadata,
  getObjectMetadata,
  getPortalView,
} from "@/lib/portal";
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

  const requestedFilters: PortalFilterInput[] = view.filterFields.map(
    (field) => ({
      field: field.name,
      operator: String(query[`op_${field.name}`] ?? "contains"),
      value: String(query[`f_${field.name}`] ?? ""),
    }),
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
        <form className="card grid gap-4 p-4 md:grid-cols-3">
          {view.filterFields.map((field) => (
            <div className="field" key={field.name}>
              <label htmlFor={`f_${field.name}`}>
                {field.label ?? field.name}
              </label>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <select
                  className="input"
                  defaultValue={String(
                    query[`op_${field.name}`] ?? "contains",
                  )}
                  name={`op_${field.name}`}
                >
                  {field.operators.map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  defaultValue={String(query[`f_${field.name}`] ?? "")}
                  id={`f_${field.name}`}
                  name={`f_${field.name}`}
                />
              </div>
            </div>
          ))}
          <div className="flex items-end gap-2">
            <button className="button" type="submit">
              Apply filters
            </button>
            <Link className="button secondary" href={`/portal/${view.slug}`}>
              Clear
            </Link>
          </div>
        </form>
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
