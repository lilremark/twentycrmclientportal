import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";

import {
  createNoteAction,
  deletePortalFilterViewAction,
  deleteRecordAttachmentAction,
  loadMorePortalRecordsAction,
  savePortalFilterViewAction,
  uploadRecordAttachmentAction,
  updateNoteAction,
  updateRecordPanelAction,
} from "@/app/actions/portal";
import { PortalAttachments } from "@/components/portal-attachments";
import { PortalDataTable } from "@/components/portal-data-table";
import { PortalExportButton } from "@/components/portal-export-button";
import { PortalFilterForm } from "@/components/portal-filter-form";
import { PortalNotes } from "@/components/portal-notes";
import { PortalRecordValue } from "@/components/portal-record-value";
import { RefreshButton } from "@/components/refresh-button";
import { RecordForm } from "@/components/record-form";
import { requirePortalViewContext } from "@/lib/access";
import { db } from "@/lib/db";
import { portalSavedViews } from "@/lib/db/schema";
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
    if (
      key === "record" ||
      key === "mode" ||
      key === "cursor" ||
      value === undefined
    ) {
      continue;
    }
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
  const savedViews = await db
    .select({
      id: portalSavedViews.id,
      name: portalSavedViews.name,
      filters: portalSavedViews.filters,
      sortField: portalSavedViews.sortField,
      sortDirection: portalSavedViews.sortDirection,
    })
    .from(portalSavedViews)
    .where(
      and(
        eq(portalSavedViews.userId, context.session.user.id),
        eq(portalSavedViews.portalViewId, view.id),
      ),
    )
    .orderBy(asc(portalSavedViews.name));
  const requestedSavedViewId =
    typeof query.saved === "string" ? query.saved : null;
  const activeSavedView =
    savedViews.find((saved) => saved.id === requestedSavedViewId) ?? null;
  const effectiveQuery = { ...query };
  if (activeSavedView) {
    for (const filter of activeSavedView.filters) {
      effectiveQuery[`f_${filter.field}`] = filter.value;
      effectiveQuery[`op_${filter.field}`] = filter.operator;
    }
    if (activeSavedView.sortField) {
      effectiveQuery.sort = activeSavedView.sortField;
      effectiveQuery.direction = activeSavedView.sortDirection;
    }
  }

  const requestedFilters: PortalFilterInput[] = view.filterFields.map(
    (config) => {
      const field = metadataByName.get(config.name);
      return {
        field: config.name,
        operator: String(
          effectiveQuery[`op_${config.name}`] ??
            (field ? defaultFilterOperator(field, config) : "eq"),
        ),
        value: String(effectiveQuery[`f_${config.name}`] ?? ""),
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
  const allowedSortFields = new Set(view.columns.map((field) => field.name));
  const requestedSortField =
    typeof effectiveQuery.sort === "string" &&
    allowedSortFields.has(effectiveQuery.sort)
      ? effectiveQuery.sort
      : null;
  const requestedSortDirection =
    effectiveQuery.direction === "desc" ? "desc" : "asc";
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
  const selectedRecordId =
    typeof query.record === "string" ? query.record : null;
  const panelMode = query.mode === "edit" ? "edit" : "detail";
  const listParams = listSearchParams(effectiveQuery);
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
  const attachmentsField = object.fields.find(
    (field) =>
      field.name === "attachments" &&
      field.relationTargetObjectNameSingular === "attachment",
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
    attachmentsField ? [{ name: attachmentsField.name }] : [],
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
          {
            selectOptions:
              metadataByName.get(effectiveRecordTitleField)?.options,
            formatSelectValues: view.formatSelectValues,
          },
        )
      : undefined;
  const fallbackRecordTitle = selectedRecord
    ? panelFields
        .map((config) =>
          displayValue(
            selectedRecord[config.name],
            metadataByName.get(config.name)?.type,
            {
              selectOptions: metadataByName.get(config.name)?.options,
              formatSelectValues: view.formatSelectValues,
            },
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
        <div className="page-actions">
          <PortalExportButton
            columns={view.columns.map((column) => ({
              name: column.name,
              label:
                column.label ??
                metadataByName.get(column.name)?.label ??
                column.name,
            }))}
            currentQueryString={listParams.toString()}
            objectLabel={object.labelPlural}
            viewSlug={view.slug}
          />
          {context.role === "contributor" && view.createFields.length ? (
            <Link className="button" href={`/portal/${view.slug}/new`}>
              Add record
            </Link>
          ) : null}
        </div>
        {view.filterFields.length || view.columns.length || savedViews.length ? (
          <PortalFilterForm
            fields={object.fields}
            filters={view.filterFields}
            query={effectiveQuery}
            clearHref={`/portal/${view.slug}`}
            activeSavedViewId={activeSavedView?.id ?? null}
            deleteSavedViewAction={
              activeSavedView
                ? deletePortalFilterViewAction.bind(
                    null,
                    view.slug,
                    activeSavedView.id,
                  )
                : undefined
            }
            saveViewAction={savePortalFilterViewAction.bind(
              null,
              view.slug,
              listParams.toString(),
            )}
            savedViews={savedViews.map((saved) => ({
              id: saved.id,
              name: saved.name,
            }))}
            sortDirection={requestedSortDirection}
            sortField={requestedSortField}
            sortFields={view.columns.map((column) => ({
              name: column.name,
              label:
                column.label ??
                metadataByName.get(column.name)?.label ??
                column.name,
            }))}
          />
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {result ? (
          <section className="card table-shell">
            <PortalDataTable
              columns={view.columns}
              formatSelectValues={view.formatSelectValues}
              metadataFields={object.fields}
              recordTitleField={effectiveRecordTitleField}
              records={result.edges.map(({ node }) => node as { id: string })}
              endCursor={result.pageInfo.endCursor ?? null}
              hasNextPage={result.pageInfo.hasNextPage}
              listKey={listParams.toString()}
              loadMoreAction={loadMorePortalRecordsAction.bind(
                null,
                view.slug,
                requestedFilters,
                requestedSortField,
                requestedSortDirection,
              )}
              recordCloseHref={closeHref}
              recordPanel={
                selectedRecordId ? (
                  <>
                    <header className="record-panel-header">
                      <div className="record-panel-heading">
                        <p className="eyebrow">{object.labelSingular}</p>
                        <h2>{recordTitle || object.labelSingular}</h2>
                        <p title={selectedRecordId}>{selectedRecordId}</p>
                      </div>
                      {selectedRecord ? (
                        <div className="record-panel-actions">
                          <RefreshButton />
                          {context.role === "contributor" &&
                          view.editFields.length &&
                          panelMode !== "edit" ? (
                            <Link
                              className="button"
                              href={editHref}
                              scroll={false}
                            >
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
                            .filter(
                              (config) =>
                                config.name !== "noteTargets" &&
                                config.name !== "attachments",
                            )
                            .map((config) => (
                              <div key={config.name}>
                                <dt>
                                  {config.label ??
                                    metadataByName.get(config.name)?.label ??
                                    config.name}
                                </dt>
                                <dd>
                                  <PortalRecordValue
                                    formatSelectValues={view.formatSelectValues}
                                    pdfPreview
                                    selectOptions={
                                      metadataByName.get(config.name)?.options
                                    }
                                    type={
                                      metadataByName.get(config.name)?.type
                                    }
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
                      {selectedRecord && attachmentsField ? (
                        <PortalAttachments
                          canUpload={context.role === "contributor"}
                          deleteAttachmentAction={deleteRecordAttachmentAction.bind(
                            null,
                            view.slug,
                            selectedRecordId,
                            listParams.toString(),
                          )}
                          uploadAction={uploadRecordAttachmentAction.bind(
                            null,
                            view.slug,
                            selectedRecordId,
                            listParams.toString(),
                          )}
                          value={selectedRecord[attachmentsField.name]}
                        />
                      ) : null}
                    </div>
                  </>
                ) : null
              }
              recordPanelTitle={`${object.labelSingular} details`}
              recordSelectionHref={recordSelectionHref}
              selectedRecordId={selectedRecordId}
            />
          </section>
        ) : null}
      </div>

    </>
  );
}
