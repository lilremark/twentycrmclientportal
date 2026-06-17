import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import {
  createNoteAction,
  updateNoteAction,
  updateRecordPanelAction,
} from "@/app/actions/portal";
import { PortalDataTable } from "@/components/portal-data-table";
import { PortalFilterForm } from "@/components/portal-filter-form";
import { PortalNotes } from "@/components/portal-notes";
import { PortalRecordValue } from "@/components/portal-record-value";
import { RecordForm } from "@/components/record-form";
import { RecordSidePanel } from "@/components/record-side-panel";
import { requirePortalViewContext } from "@/lib/access";
import {
  displayValue,
  getLatestMetadata,
  getObjectMetadata,
} from "@/lib/portal";
import {
  getScopedPortalRecord,
  mergePortalFields,
} from "@/lib/portal-record";
import { extractPortalNotes } from "@/lib/portal-notes";
import { defaultFilterOperator } from "@/lib/portal-view-config";
import { listTwentyRecords, TwentyApiError } from "@/lib/twenty/client";
import {
  buildScopedFilter,
  buildPortalScopeFilter,
  type PortalFilterInput,
} from "@/lib/twenty/filters";
import { gqlEnum } from "@/lib/twenty/graphql";

function listSearchParams(
  query: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "record" || key === "mode" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, item);
    }
  }
  return params;
}

export default async function PortalListPage({
  params,
  searchParams,
}: {
  params: Promise<{ viewSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ viewSlug }, query, metadata] = await Promise.all([
    params,
    searchParams,
    getLatestMetadata(),
  ]);
  const context = await requirePortalViewContext(viewSlug);
  const view = context.view;
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
    scopeFilter: buildPortalScopeFilter({
      scopeMode: view.scopeMode,
      scopeFieldName: view.scopeFieldName,
      allowedRecordIds: view.allowedRecordIds,
      twentyPersonId: context.twentyPersonId,
      metadataFields: object.fields,
    }),
    fixedFilters: view.fixedFilters,
    metadataFields: object.fields,
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
  const selectedRecordId =
    typeof query.record === "string" ? query.record : null;
  const panelMode = query.mode === "edit" ? "edit" : "detail";
  const listParams = listSearchParams(query);
  const closeHref = `/portal/${view.slug}${
    listParams.size ? `?${listParams.toString()}` : ""
  }`;
  const recordSelectionHref = `${closeHref}${
    listParams.size ? "&" : "?"
  }record=`;
  const selectedParams = new URLSearchParams(listParams);
  if (selectedRecordId) selectedParams.set("record", selectedRecordId);
  const detailHref = `/portal/${view.slug}?${selectedParams.toString()}`;
  const editParams = new URLSearchParams(selectedParams);
  editParams.set("mode", "edit");
  const editHref = `/portal/${view.slug}?${editParams.toString()}`;
  const noteTargetsField = object.fields.find(
    (field) => field.name === "noteTargets",
  );
  const effectiveRecordTitleField =
    view.recordTitleField ??
    object.fields.find((field) => field.name === "name")?.name ??
    null;
  const panelFields = mergePortalFields(
    effectiveRecordTitleField ? [{ name: effectiveRecordTitleField }] : [],
    view.detailFields,
    view.columns,
    view.editFields,
    noteTargetsField ? [{ name: noteTargetsField.name }] : [],
  );

  let result:
    | Awaited<ReturnType<typeof listTwentyRecords>>
    | undefined;
  let error: string | undefined;
  let selectedRecord: Record<string, unknown> | null = null;
  let selectedRecordError: string | undefined;
  const listRequest = listTwentyRecords({
    objectNamePlural: view.objectNamePlural,
    fields: view.columns,
    metadataFields: object.fields,
    filter,
    orderBy,
    cursor,
  });
  const recordRequest = selectedRecordId
    ? getScopedPortalRecord({
        objectNameSingular: view.objectNameSingular,
        fields: panelFields,
        metadataFields: object.fields,
        recordId: selectedRecordId,
        scopeMode: view.scopeMode,
        scopeFieldName: view.scopeFieldName,
        allowedRecordIds: view.allowedRecordIds,
        twentyPersonId: context.twentyPersonId,
        fixedFilters: view.fixedFilters,
      })
    : Promise.resolve(null);
  const [listOutcome, recordOutcome] = await Promise.allSettled([
    listRequest,
    recordRequest,
  ]);

  if (listOutcome.status === "fulfilled") {
    result = listOutcome.value;
  } else {
    const caught = listOutcome.reason;
    error =
      caught instanceof TwentyApiError
        ? caught.message
        : "The records could not be loaded.";
  }
  if (selectedRecordId) {
    if (recordOutcome.status === "fulfilled") {
      selectedRecord = recordOutcome.value;
      if (!selectedRecord) {
        selectedRecordError =
          "This record is unavailable or is not shared through this portal.";
      }
    } else {
      const caught = recordOutcome.reason;
      selectedRecordError =
        caught instanceof TwentyApiError
          ? caught.message
          : "The record details could not be loaded.";
    }
  }
  const configuredRecordTitle =
    selectedRecord && effectiveRecordTitleField
      ? displayValue(
          selectedRecord[effectiveRecordTitleField],
          metadataByName.get(effectiveRecordTitleField)?.type,
        )
      : undefined;
  const fallbackRecordTitle = selectedRecord
    ? panelFields
        .map((config) =>
          displayValue(
            selectedRecord[config.name],
            metadataByName.get(config.name)?.type,
          ),
        )
        .find((value) => value && value !== "—")
    : undefined;
  const recordTitle =
    (configuredRecordTitle && configuredRecordTitle !== "—"
      ? configuredRecordTitle
      : fallbackRecordTitle
    )?.slice(0, 80);
  const selectedNotes = extractPortalNotes(selectedRecord);

  return (
    <>
      <div className="page-stack">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{object.labelPlural}</p>
            <h2 className="text-2xl font-bold">{view.label}</h2>
            <p>
              Showing only records shared through this portal.
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
            clearHref={`/portal/${view.slug}`}
          />
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {result ? (
          <section className="card table-shell">
            <PortalDataTable
              columns={view.columns}
              metadataFields={object.fields}
              recordTitleField={effectiveRecordTitleField}
              records={result.edges.map(({ node }) => node as { id: string })}
              recordCloseHref={closeHref}
              recordSelectionHref={recordSelectionHref}
              selectedRecordId={selectedRecordId}
            />
            {result.pageInfo.hasNextPage && result.pageInfo.endCursor ? (
              <div className="border-t border-[var(--border)] p-4 text-right">
                <Link
                  className="button secondary"
                  href={(() => {
                    const next = new URLSearchParams(listParams);
                    next.set("cursor", result.pageInfo.endCursor);
                    return `/portal/${view.slug}?${next.toString()}`;
                  })()}
                >
                  Next page
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      {selectedRecordId ? (
        <RecordSidePanel
          closeHref={closeHref}
          title={`${object.labelSingular} details`}
        >
          <header className="record-panel-header">
            <div className="record-panel-heading">
              <p className="eyebrow">{object.labelSingular}</p>
              <h2>{recordTitle || object.labelSingular}</h2>
              <p title={selectedRecordId}>{selectedRecordId}</p>
            </div>
            {selectedRecord ? (
              <div className="record-panel-actions">
                {context.role === "contributor" &&
                view.editFields.length &&
                panelMode !== "edit" ? (
                  <Link className="button" href={editHref} scroll={false}>
                    <Pencil size={14} />
                    Edit
                  </Link>
                ) : null}
              </div>
            ) : null}
          </header>

          <div className="record-panel-body">
            {selectedRecordError ? (
              <div className="record-panel-message">
                <strong>Record unavailable</strong>
                <p>{selectedRecordError}</p>
              </div>
            ) : selectedRecord && panelMode === "edit" ? (
              <RecordForm
                action={updateRecordPanelAction.bind(
                  null,
                  view.slug,
                  selectedRecordId,
                  listParams.toString(),
                )}
                appearance="panel"
                cancelHref={detailHref}
                fields={view.editFields}
                metadataFields={object.fields}
                submitLabel="Save changes"
                values={selectedRecord}
              />
            ) : selectedRecord ? (
              <dl className="record-panel-details">
                {panelFields
                  .filter((config) => config.name !== "noteTargets")
                  .map((config) => (
                    <div key={config.name}>
                      <dt>
                        {config.label ??
                          metadataByName.get(config.name)?.label ??
                          config.name}
                      </dt>
                      <dd>
                        <PortalRecordValue
                          pdfPreview
                          type={metadataByName.get(config.name)?.type}
                          value={selectedRecord[config.name]}
                        />
                      </dd>
                    </div>
                  ))}
              </dl>
            ) : null}
            {selectedRecord && noteTargetsField ? (
              <PortalNotes
                canEdit={context.role === "contributor"}
                createAction={createNoteAction.bind(
                  null,
                  view.slug,
                  selectedRecordId,
                  listParams.toString(),
                )}
                notes={selectedNotes}
                updateAction={updateNoteAction.bind(
                  null,
                  view.slug,
                  selectedRecordId,
                  listParams.toString(),
                )}
              />
            ) : null}
          </div>
        </RecordSidePanel>
      ) : null}
    </>
  );
}
