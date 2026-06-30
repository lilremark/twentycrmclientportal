import Link from "next/link";
import { notFound } from "next/navigation";

import { eq } from "drizzle-orm";
import { ArrowLeft, Eye, Monitor } from "lucide-react";

import { DashboardReportSurface } from "@/components/dashboard-report-surface";
import { PortalDataTable } from "@/components/portal-data-table";
import { PortalFilterForm } from "@/components/portal-filter-form";
import { AppSelect } from "@/components/ui/app-select";
import { requireAdmin } from "@/lib/access";
import { db } from "@/lib/db";
import { clientAccounts, portalViews } from "@/lib/db/schema";
import { getLatestMetadata, getObjectMetadata } from "@/lib/portal";
import {
  buildDashboardResults,
  dashboardRequiredFields,
} from "@/lib/portal-dashboard";
import { listDashboardRecords } from "@/lib/portal-dashboard-records";
import { defaultFilterOperator } from "@/lib/portal-view-config";
import { listTwentyRecords, TwentyApiError } from "@/lib/twenty/client";
import {
  buildPortalScopeFilter,
  buildScopedFilter,
  type PortalFilterInput,
} from "@/lib/twenty/filters";
import { gqlEnum } from "@/lib/twenty/graphql";

export default async function PortalViewPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ viewId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const [{ viewId }, query, metadata, clients] = await Promise.all([
    params,
    searchParams,
    getLatestMetadata(),
    db
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.isActive, true))
      .orderBy(clientAccounts.name),
  ]);
  const view = await db.query.portalViews.findFirst({
    where: eq(portalViews.id, viewId),
  });
  if (!view) notFound();

  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) notFound();

  const selectedClient =
    clients.find((client) => client.id === query.clientId) ??
    clients[0] ??
    null;
  const activeTab = query.tab === "reports" ? "reports" : "records";
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

  const personId =
    view.scopeMode === "person" ? selectedClient?.twentyPersonId ?? null : null;
  let result: Awaited<ReturnType<typeof listTwentyRecords>> | undefined;
  let dashboardResults: ReturnType<typeof buildDashboardResults> | undefined;
  let error: string | undefined;

  if (view.scopeMode === "person" && !personId) {
    error = "Add an active client account to preview this Person-scoped portal.";
  } else if (!view.isEnabled || view.validationErrors.length) {
    error = "This portal is disabled because its configuration needs attention.";
  } else {
    try {
      const scopeFilter = buildPortalScopeFilter({
        scopeMode: view.scopeMode,
        scopeFieldName: view.scopeFieldName,
        allowedRecordIds: view.allowedRecordIds,
        twentyPersonId: personId,
        metadataFields: object.fields,
      });
      const filter = buildScopedFilter({
          scopeFilter,
          fixedFilters: view.fixedFilters,
          metadataFields: object.fields,
          configuredFilters: view.filterFields,
          requestedFilters,
        });
      if (activeTab === "reports") {
        const dashboardRecords = await listDashboardRecords({
          objectNamePlural: view.objectNamePlural,
          fields: dashboardRequiredFields(view.dashboardWidgets, object.fields),
          metadataFields: object.fields,
          filter,
        });
        dashboardResults = buildDashboardResults({
          widgets: view.dashboardWidgets,
          records: dashboardRecords,
          fields: object.fields,
        });
      } else {
        result = await listTwentyRecords({
          objectNamePlural: view.objectNamePlural,
          fields: view.columns,
          metadataFields: object.fields,
          filter,
          orderBy: view.defaultSortField
            ? {
                [view.defaultSortField]: gqlEnum(
                  view.defaultSortDirection === "desc"
                    ? "DescNullsLast"
                    : "AscNullsLast",
                ),
              }
            : undefined,
        });
      }
    } catch (caught) {
      error =
        caught instanceof TwentyApiError
          ? caught.message
          : "The preview records could not be loaded.";
    }
  }

  const previewPath = `/admin/views/${view.id}/preview`;
  const clearParams = new URLSearchParams();
  if (selectedClient && view.scopeMode === "person") {
    clearParams.set("clientId", selectedClient.id);
  }
  if (activeTab === "reports") {
    clearParams.set("tab", "reports");
  }
  const clearHref = `${previewPath}${
    clearParams.size ? `?${clearParams.toString()}` : ""
  }`;

  return (
    <div className="page-stack">
      <div className="page-actions">
        <Link className="button secondary" href={`/admin/views/${view.id}`}>
          <ArrowLeft size={17} />
          Back to configuration
        </Link>
      </div>

      <div className="preview-banner">
        <div>
          <strong className="flex items-center gap-2 text-sm">
            <Eye size={17} />
            Preview context
          </strong>
          <p>
            {view.scopeMode === "person"
              ? "Choose which client Person scope to render."
              : view.scopeMode === "all"
                ? "Showing all current records allowed by saved filters."
                : `${view.allowedRecordIds.length} specifically shared records.`}
          </p>
        </div>
        {view.scopeMode === "person" ? (
          <form className="flex flex-wrap items-end gap-2">
            <div className="field min-w-60">
              <label htmlFor="clientId">Client account</label>
              <AppSelect
                className="input"
                defaultValue={selectedClient?.id ?? ""}
                id="clientId"
                name="clientId"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </AppSelect>
              {activeTab === "reports" ? (
                <input name="tab" type="hidden" value="reports" />
              ) : null}
            </div>
            <button className="button secondary" type="submit">
              Update preview
            </button>
          </form>
        ) : null}
      </div>

      <section className="preview-canvas">
        <div className="preview-canvas-header">
          <div className="flex items-center gap-2">
            <Monitor size={17} />
            <strong className="text-sm">External portal experience</strong>
          </div>
          <span className="badge">Read only</span>
        </div>
        <div className="preview-canvas-body">
          <nav aria-label="Preview sections" className="app-section-tabs">
            <Link
              aria-current={activeTab === "records" ? "page" : undefined}
              className={`app-section-tab ${
                activeTab === "records" ? "active" : ""
              }`}
              href={`${previewPath}${
                selectedClient && view.scopeMode === "person"
                  ? `?clientId=${selectedClient.id}`
                  : ""
              }`}
            >
              Records
            </Link>
            <Link
              aria-current={activeTab === "reports" ? "page" : undefined}
              className={`app-section-tab ${
                activeTab === "reports" ? "active" : ""
              }`}
              href={`${previewPath}?${new URLSearchParams({
                ...(selectedClient && view.scopeMode === "person"
                  ? { clientId: selectedClient.id }
                  : {}),
                tab: "reports",
              }).toString()}`}
            >
              Reports
            </Link>
          </nav>
          {activeTab === "records" ? (
            <div className="page-actions">
            {view.createFields.length && view.scopeMode !== "records" ? (
              <span aria-disabled="true" className="button opacity-60">
                Add record
              </span>
            ) : null}
            </div>
          ) : null}
          {activeTab === "records" && view.filterFields.length ? (
            <PortalFilterForm
              clearHref={clearHref}
              fields={object.fields}
              filters={view.filterFields}
              hiddenParams={
                selectedClient && view.scopeMode === "person"
                  ? { clientId: selectedClient.id }
                  : {}
              }
              query={query}
            />
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {activeTab === "records" && result ? (
            <section className="card table-shell">
              <PortalDataTable
                columns={view.columns}
                formatSelectValues={view.formatSelectValues}
                metadataFields={object.fields}
                records={result.edges.map(({ node }) => node as { id: string })}
                recordBaseHref={null}
              />
            </section>
          ) : null}
          {activeTab === "reports" && dashboardResults?.length ? (
            <DashboardReportSurface
              exportable
              items={dashboardResults}
              title={`${view.label} reports preview`}
            />
          ) : null}
          {activeTab === "reports" &&
          !error &&
          !view.dashboardWidgets.length ? (
            <section className="card empty-state">
              <div>
                <strong>No reports configured</strong>
                <p>Add dashboard widgets in the portal view configuration.</p>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
