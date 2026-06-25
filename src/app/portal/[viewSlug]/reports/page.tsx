import { notFound } from "next/navigation";

import { DashboardReportSurface } from "@/components/dashboard-report-surface";
import { requirePortalViewContext } from "@/lib/access";
import {
  buildDashboardResults,
  dashboardRequiredFields,
} from "@/lib/portal-dashboard";
import { listDashboardRecords } from "@/lib/portal-dashboard-records";
import { getLatestMetadata, getObjectMetadata } from "@/lib/portal";
import { buildPortalScopeFilter, buildScopedFilter } from "@/lib/twenty/filters";
import { TwentyApiError } from "@/lib/twenty/client";

function EmptyReports() {
  return (
    <section className="card empty-state">
      <div>
        <strong>No reports configured</strong>
        <p>Ask an administrator to add dashboard widgets for this portal view.</p>
      </div>
    </section>
  );
}

export default async function PortalReportsPage({
  params,
}: {
  params: Promise<{ viewSlug: string }>;
}) {
  const [{ viewSlug }, metadata] = await Promise.all([
    params,
    getLatestMetadata(),
  ]);
  const context = await requirePortalViewContext(viewSlug);
  const view = context.view;
  if (!view?.isEnabled || view.validationErrors.length) notFound();
  const object = getObjectMetadata(metadata, view.objectNameSingular);
  if (!object) notFound();

  if (!view.dashboardWidgets.length) {
    return <EmptyReports />;
  }

  const fields = dashboardRequiredFields(view.dashboardWidgets, object.fields);
  const filter = buildScopedFilter({
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
  });

  let records: Record<string, unknown>[] = [];
  let error: string | undefined;
  try {
    records = await listDashboardRecords({
      objectNamePlural: view.objectNamePlural,
      fields,
      metadataFields: object.fields,
      filter,
    });
  } catch (caught) {
    error =
      caught instanceof TwentyApiError
        ? caught.message
        : "The reports could not be loaded.";
  }

  const results = buildDashboardResults({
    widgets: view.dashboardWidgets,
    records,
    fields: object.fields,
  });

  return (
    <div className="page-stack">
      {error ? <p className="error">{error}</p> : null}
      {!error ? (
        <DashboardReportSurface
          editable
          exportable
          items={results}
          storageKey={`portal-dashboard-layout:${view.id}`}
          title={`${view.label} reports`}
        />
      ) : null}
    </div>
  );
}
