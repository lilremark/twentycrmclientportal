import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { requirePortalViewContext } from "@/lib/access";
import { db } from "@/lib/db";
import { portalSavedViews } from "@/lib/db/schema";
import {
  exportColumns,
  portalExportFilename,
  recordsToCsv,
  recordsToXlsx,
} from "@/lib/portal-export";
import { getLatestMetadata, getObjectMetadata } from "@/lib/portal";
import { defaultFilterOperator } from "@/lib/portal-view-config";
import { listTwentyRecords } from "@/lib/twenty/client";
import {
  buildPortalScopeFilter,
  buildScopedFilter,
  type PortalFilterInput,
} from "@/lib/twenty/filters";
import { gqlEnum } from "@/lib/twenty/graphql";

export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 5000;

function disposition(filename: string) {
  const safe = filename.replace(/["\r\n]/g, "");
  return `attachment; filename="${safe}"`;
}

function selectedColumnNames(searchParams: URLSearchParams) {
  const repeated = searchParams.getAll("column");
  const commaSeparated = searchParams
    .getAll("columns")
    .flatMap((value) => value.split(","));
  return [...repeated, ...commaSeparated]
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ viewSlug: string }> },
) {
  const { viewSlug } = await context.params;
  const requestUrl = new URL(request.url);
  const format = requestUrl.searchParams.get("format") === "xlsx"
    ? "xlsx"
    : "csv";
  const scope = requestUrl.searchParams.get("scope") === "all"
    ? "all"
    : "filtered";
  const [portalContext, metadata] = await Promise.all([
    requirePortalViewContext(viewSlug),
    getLatestMetadata(),
  ]);
  const view = portalContext.view;
  if (!view?.isEnabled || view.validationErrors.length) {
    return NextResponse.json({ error: "Portal view unavailable" }, { status: 404 });
  }

  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) {
    return NextResponse.json({ error: "Portal metadata unavailable" }, { status: 404 });
  }

  const savedViews = await db
    .select({
      id: portalSavedViews.id,
      filters: portalSavedViews.filters,
      sortField: portalSavedViews.sortField,
      sortDirection: portalSavedViews.sortDirection,
    })
    .from(portalSavedViews)
    .where(
      and(
        eq(portalSavedViews.userId, portalContext.session.user.id),
        eq(portalSavedViews.portalViewId, view.id),
      ),
    )
    .orderBy(asc(portalSavedViews.name));

  const query = new URLSearchParams(requestUrl.searchParams);
  const activeSavedView =
    scope === "filtered"
      ? savedViews.find((saved) => saved.id === query.get("saved")) ?? null
      : null;
  if (activeSavedView) {
    for (const filter of activeSavedView.filters) {
      query.set(`f_${filter.field}`, filter.value);
      query.set(`op_${filter.field}`, filter.operator);
    }
    if (activeSavedView.sortField) {
      query.set("sort", activeSavedView.sortField);
      query.set("direction", activeSavedView.sortDirection);
    }
  }

  const metadataByName = new Map(
    object.fields.map((field) => [field.name, field]),
  );
  const requestedFilters: PortalFilterInput[] =
    scope === "filtered"
      ? view.filterFields.map((config) => {
          const field = metadataByName.get(config.name);
          return {
            field: config.name,
            operator: String(
              query.get(`op_${config.name}`) ??
                (field ? defaultFilterOperator(field, config) : "eq"),
            ),
            value: String(query.get(`f_${config.name}`) ?? ""),
          };
        })
      : [];
  const filter = buildScopedFilter({
    scopeFilter: buildPortalScopeFilter({
      scopeMode: view.scopeMode,
      scopeFieldName: view.scopeFieldName,
      allowedRecordIds: view.allowedRecordIds,
      twentyPersonId: portalContext.twentyPersonId,
      metadataFields: object.fields,
    }),
    fixedFilters: view.fixedFilters,
    metadataFields: object.fields,
    configuredFilters: view.filterFields,
    requestedFilters,
  });

  const allowedSortFields = new Set(view.columns.map((field) => field.name));
  const requestedSortField = allowedSortFields.has(query.get("sort") ?? "")
    ? query.get("sort")
    : null;
  const requestedSortDirection = query.get("direction") === "desc" ? "desc" : "asc";
  const effectiveSortField = requestedSortField ?? view.defaultSortField;
  const effectiveSortDirection = requestedSortField
    ? requestedSortDirection
    : view.defaultSortDirection;
  const orderBy = effectiveSortField
    ? {
        [effectiveSortField]: gqlEnum(
          effectiveSortDirection === "desc"
            ? "DescNullsLast"
            : "AscNullsLast",
        ),
      }
    : undefined;
  const columns = exportColumns({
    columns: view.columns,
    metadataFields: object.fields,
    selectedNames: selectedColumnNames(requestUrl.searchParams),
  });
  if (!columns.length) {
    return NextResponse.json(
      { error: "Choose at least one export column" },
      { status: 400 },
    );
  }

  const records: Array<Record<string, unknown>> = [];
  let cursor: string | undefined;
  let truncated = false;

  do {
    const result = await listTwentyRecords({
      objectNamePlural: view.objectNamePlural,
      fields: columns.map((column) => ({
        name: column.name,
        label: column.label,
      })),
      metadataFields: object.fields,
      filter,
      orderBy,
      cursor,
    });
    for (const edge of result.edges) {
      if (records.length >= MAX_EXPORT_ROWS) {
        truncated = true;
        break;
      }
      records.push(edge.node);
    }
    cursor = result.pageInfo.hasNextPage
      ? result.pageInfo.endCursor
      : undefined;
  } while (cursor && !truncated);

  const filename = portalExportFilename({ label: view.label, format });
  const body =
    format === "xlsx"
      ? recordsToXlsx({
          columns,
          records,
          formatSelectValues: view.formatSelectValues,
        })
      : recordsToCsv({
          columns,
          records,
          formatSelectValues: view.formatSelectValues,
        });

  return new Response(body, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": disposition(filename),
      "content-type":
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-portal-export-row-count": String(records.length),
      ...(truncated ? { "x-portal-export-truncated": "true" } : {}),
    },
  });
}
