"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { listShareableRecordsAction } from "@/app/actions/admin";
import type {
  PortalFieldConfig,
  PortalFixedFilter,
  PortalFilterConfig,
  TwentyFieldMetadata,
  TwentyObjectMetadata,
} from "@/lib/db/schema";
import {
  fixedFilterablePortalFields,
  fixedFilterOperatorsForType,
  personScopeFields,
  selectablePortalFields,
} from "@/lib/portal-view-config";

type InitialView = {
  label: string;
  slug: string;
  objectNameSingular: string;
  scopeFieldName: string;
  scopeMode: string;
  allowedRecordIds: string[];
  columns: PortalFieldConfig[];
  detailFields: PortalFieldConfig[];
  filterFields: PortalFilterConfig[];
  fixedFilters: PortalFixedFilter[];
  createFields: PortalFieldConfig[];
  editFields: PortalFieldConfig[];
  defaultSortField: string | null;
  defaultSortDirection: string;
  navigationOrder: number;
};

function selectedNames(items?: Array<{ name: string }>) {
  return items?.map((item) => item.name) ?? [];
}

const permissionColumns = [
  {
    name: "columns",
    label: "Table",
    description: "Show in the record list",
  },
  {
    name: "detailFields",
    label: "Detail",
    description: "Show on record pages",
  },
  {
    name: "filterFields",
    label: "Filter",
    description: "Let users filter by it",
  },
  {
    name: "createFields",
    label: "Create",
    description: "Allow during creation",
  },
  {
    name: "editFields",
    label: "Edit",
    description: "Allow during editing",
  },
] as const;

function FieldPermissionsMatrix({
  fields,
  defaults,
}: {
  fields: ReturnType<typeof selectablePortalFields>;
  defaults: Record<(typeof permissionColumns)[number]["name"], string[]>;
}) {
  return (
    <div className="field-permissions-shell">
      <div className="field-permissions-scroll">
        <div className="field-permissions-table">
          <div className="field-permissions-header" role="row">
            <span>Twenty field</span>
            {permissionColumns.map((column) => (
              <span key={column.name} title={column.description}>
                {column.label}
              </span>
            ))}
          </div>
          {fields.map((field) => (
            <div className="field-permissions-row" key={field.id} role="row">
              <div>
                <strong>{field.label}</strong>
                <span>
                  {field.name} · {field.type.replaceAll("_", " ")}
                </span>
              </div>
              {permissionColumns.map((column) => (
                <label
                  className="permission-checkbox"
                  key={column.name}
                  title={`${column.label}: ${field.label}`}
                >
                  <input
                    aria-label={`${field.label}: ${column.label}`}
                    defaultChecked={defaults[column.name].includes(field.name)}
                    name={column.name}
                    type="checkbox"
                    value={field.name}
                  />
                  <span aria-hidden="true" />
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type FixedFilterDraft = PortalFixedFilter & { id: string };

const operatorLabels: Record<string, string> = {
  eq: "Equals",
  neq: "Does not equal",
  contains: "Contains",
  startsWith: "Starts with",
  gt: "Greater than",
  gte: "At least",
  lt: "Less than",
  lte: "At most",
  containsAny: "Contains any of",
  in: "Is any of",
};

function filterInputType(field: TwentyFieldMetadata) {
  if (["NUMBER", "NUMERIC", "CURRENCY"].includes(field.type)) return "number";
  if (field.type === "DATE") return "date";
  if (field.type === "DATE_TIME") return "datetime-local";
  return "text";
}

function FixedFilterBuilder({
  fields,
  initialFilters,
}: {
  fields: TwentyFieldMetadata[];
  initialFilters: PortalFixedFilter[];
}) {
  const availableFields = fixedFilterablePortalFields(fields);
  const [filters, setFilters] = useState<FixedFilterDraft[]>(
    initialFilters.map((filter, index) => ({
      ...filter,
      id: `initial-${index}`,
    })),
  );

  const updateFilter = (
    id: string,
    update: Partial<Omit<FixedFilterDraft, "id">>,
  ) => {
    setFilters((current) =>
      current.map((filter) =>
        filter.id === id ? { ...filter, ...update } : filter,
      ),
    );
  };

  const addFilter = () => {
    setFilters((current) => [
      ...current,
      {
        id: `new-${Date.now()}-${current.length}`,
        name: "",
        operator: "eq",
        value: "",
      },
    ]);
  };

  return (
    <div className="fixed-filter-builder">
      {filters.length ? (
        <div className="fixed-filter-list">
          {filters.map((filter, index) => {
            const field = availableFields.find(
              (item) => item.name === filter.name,
            );
            const operators = field
              ? fixedFilterOperatorsForType(field.type)
              : ["eq"];
            const selectedValues = filter.value
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean);

            return (
              <div className="fixed-filter-row" key={filter.id}>
                <input
                  name="fixedFilters"
                  type="hidden"
                  value={JSON.stringify({
                    name: filter.name,
                    operator: filter.operator,
                    value: filter.value,
                  })}
                />
                <div className="fixed-filter-row-heading">
                  <strong>Condition {index + 1}</strong>
                  <button
                    aria-label={`Remove condition ${index + 1}`}
                    className="icon-button danger"
                    onClick={() =>
                      setFilters((current) =>
                        current.filter((item) => item.id !== filter.id),
                      )
                    }
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="fixed-filter-controls">
                  <div className="field">
                    <label htmlFor={`fixed-field-${filter.id}`}>Field</label>
                    <select
                      className="input"
                      id={`fixed-field-${filter.id}`}
                      onChange={(event) => {
                        const nextField = availableFields.find(
                          (item) => item.name === event.target.value,
                        );
                        updateFilter(filter.id, {
                          name: event.target.value,
                          label: nextField?.label,
                          operator: nextField
                            ? fixedFilterOperatorsForType(nextField.type)[0]
                            : "eq",
                          value: "",
                        });
                      }}
                      required
                      value={filter.name}
                    >
                      <option value="">Choose a field</option>
                      {availableFields.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.label} · {item.type.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {field ? (
                    <>
                      {operators.length > 1 ? (
                        <div className="field">
                          <label htmlFor={`fixed-operator-${filter.id}`}>
                            Match
                          </label>
                          <select
                            className="input"
                            id={`fixed-operator-${filter.id}`}
                            onChange={(event) =>
                              updateFilter(filter.id, {
                                operator: event.target.value,
                              })
                            }
                            value={filter.operator}
                          >
                            {operators.map((operator) => (
                              <option key={operator} value={operator}>
                                {operatorLabels[operator] ?? operator}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="fixed-filter-operator">
                          <span>Match</span>
                          <strong>
                            {operatorLabels[filter.operator] ??
                              filter.operator}
                          </strong>
                        </div>
                      )}

                      <div className="field fixed-filter-value">
                        <label>Value</label>
                        {["SELECT", "MULTI_SELECT"].includes(field.type) &&
                        field.options ? (
                          <div className="option-checkbox-grid">
                            {field.options.map((option) => (
                              <label key={option.value}>
                                <input
                                  checked={selectedValues.includes(option.value)}
                                  onChange={(event) => {
                                    const values = event.target.checked
                                      ? [...selectedValues, option.value]
                                      : selectedValues.filter(
                                          (value) => value !== option.value,
                                        );
                                    updateFilter(filter.id, {
                                      value: [...new Set(values)].join(","),
                                    });
                                  }}
                                  type="checkbox"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        ) : field.type === "BOOLEAN" ? (
                          <select
                            className="input"
                            onChange={(event) =>
                              updateFilter(filter.id, {
                                value: event.target.value,
                              })
                            }
                            required
                            value={filter.value}
                          >
                            <option value="">Choose a value</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            className="input"
                            onChange={(event) =>
                              updateFilter(filter.id, {
                                value: event.target.value,
                              })
                            }
                            placeholder={
                              field.type === "RELATION"
                                ? "Twenty record ID"
                                : "Filter value"
                            }
                            required
                            step={
                              ["NUMBER", "NUMERIC", "CURRENCY"].includes(
                                field.type,
                              )
                                ? "any"
                                : undefined
                            }
                            type={filterInputType(field)}
                            value={filter.value}
                          />
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fixed-filter-empty">
          <strong>No saved record filters</strong>
          <p>
            Add a condition to permanently limit which records this portal can
            display.
          </p>
        </div>
      )}
      <button
        className="button secondary"
        disabled={!availableFields.length}
        onClick={addFilter}
        type="button"
      >
        <Plus size={16} />
        Add record filter
      </button>
      <p className="field-help">
        Saved conditions are always enforced by the server and combined with
        AND.
      </p>
    </div>
  );
}

export function PortalViewForm({
  action,
  objects,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  objects: TwentyObjectMetadata[];
  initial?: InitialView;
  submitLabel: string;
}) {
  const [objectName, setObjectName] = useState(
    initial?.objectNameSingular ?? "",
  );
  const [objectSearch, setObjectSearch] = useState("");
  const [scopeMode, setScopeMode] = useState(initial?.scopeMode ?? "all");
  const [recordSearch, setRecordSearch] = useState("");
  const [records, setRecords] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const [selectedRecordIds, setSelectedRecordIds] = useState(
    initial?.allowedRecordIds ?? [],
  );
  const [recordsPending, startRecordsTransition] = useTransition();
  const filteredObjects = objects.filter((item) =>
    `${item.labelSingular} ${item.nameSingular}`
      .toLowerCase()
      .includes(objectSearch.toLowerCase()),
  );
  const object = useMemo(
    () => objects.find((item) => item.nameSingular === objectName),
    [objectName, objects],
  );
  const fields = selectablePortalFields(object?.fields ?? []);
  const scopeFields = personScopeFields(object?.fields ?? []);
  const initialApplies = initial?.objectNameSingular === objectName;
  const defaults = (items?: Array<{ name: string }>) =>
    initialApplies ? selectedNames(items) : [];
  const visibleRecords = records.filter((record) =>
    `${record.label} ${record.id}`
      .toLowerCase()
      .includes(recordSearch.toLowerCase()),
  );

  return (
    <form action={action} className="card form-card portal-view-form">
      <div>
        <h2 className="text-lg font-bold">
          {initial ? `Edit ${initial.label}` : "Create a portal view"}
        </h2>
        <p className="mt-1 text-sm text-[#68758a]">
          Choose an object, then select the fields clients can see, filter, and
          edit. API names are filled from synchronized Twenty metadata.
        </p>
      </div>

      {!objects.length ? (
        <p className="error text-sm">
          Synchronize Twenty metadata before creating a portal view.
        </p>
      ) : null}

      <section className="portal-form-section">
        <div className="portal-form-section-heading">
          <div>
            <h3>Portal identity</h3>
            <p>Name the view and choose its portal URL.</p>
          </div>
        </div>
        <div className="portal-form-grid two-column">
          <div className="field">
            <label htmlFor="label">Navigation label</label>
            <input
              className="input"
              defaultValue={initial?.label}
              id="label"
              name="label"
              placeholder="Sales calls"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="slug">URL slug</label>
            <input
              className="input"
              defaultValue={initial?.slug}
              id="slug"
              name="slug"
              pattern="[a-z0-9-]+"
              placeholder="sales-calls"
              required
            />
            <span className="field-help">
              Lowercase letters, numbers, and hyphens. The slug
              &quot;settings&quot; is reserved.
            </span>
          </div>
        </div>
      </section>

      <section className="portal-form-section">
        <div className="portal-form-section-heading">
          <div>
            <h3>Twenty data source</h3>
            <p>Find and select the Twenty object shown in this portal.</p>
          </div>
        </div>
        <div className="portal-form-grid two-column">
          <div className="field">
            <label htmlFor="objectSearch">Search objects</label>
            <input
              className="input"
              id="objectSearch"
              onChange={(event) => setObjectSearch(event.target.value)}
              placeholder="Search by label or API name"
              type="search"
              value={objectSearch}
            />
          </div>
          <div className="field">
            <label htmlFor="objectNameSingular">Twenty object</label>
            <select
              className="input"
              id="objectNameSingular"
              name="objectNameSingular"
              onChange={(event) => {
                const nextObject = event.target.value;
                setObjectName(nextObject);
                setRecords([]);
                setRecordSearch("");
                setSelectedRecordIds(
                  nextObject === initial?.objectNameSingular
                    ? initial.allowedRecordIds
                    : [],
                );
              }}
              required
              value={objectName}
            >
              <option value="">Choose an object</option>
              {filteredObjects.map((item) => (
                <option key={item.id} value={item.nameSingular}>
                  {item.labelSingular} · {item.nameSingular}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="portal-form-section">
        <div className="portal-form-section-heading">
          <div>
            <h3>Record access</h3>
            <p>Control exactly which records external users can access.</p>
          </div>
        </div>
        <div className="portal-form-grid two-column">
          <div className="field">
            <label htmlFor="scopeMode">Sharing method</label>
            <select
              className="input"
              id="scopeMode"
              name="scopeMode"
              onChange={(event) => setScopeMode(event.target.value)}
              required
              value={scopeMode}
            >
              <option value="all">All current records</option>
              <option value="person">Records linked to a Person</option>
              <option value="records">Only specific records</option>
            </select>
          </div>
        {scopeMode === "person" ? (
          <div className="field">
            <label htmlFor="scopeFieldName">Person scope field</label>
            <select
              className="input"
              defaultValue={initialApplies ? initial?.scopeFieldName : ""}
              id="scopeFieldName"
              key={`scope-${objectName}`}
              name="scopeFieldName"
              required
            >
              <option value="">Choose the Person relation or ID field</option>
              {scopeFields.map((field) => (
                <option key={field.id} value={field.name}>
                  {field.label} · {field.type}
                </option>
              ))}
            </select>
          </div>
        ) : scopeMode === "records" ? (
          <div className="portal-record-panel">
            {selectedRecordIds.map((recordId) => (
              <input
                key={recordId}
                name="allowedRecordIds"
                type="hidden"
                value={recordId}
              />
            ))}
            <div className="portal-record-panel-heading">
              <div>
                <strong>Specific records</strong>
                <p>Load the selected object, then choose the records to share.</p>
              </div>
              <div className="form-actions">
                {selectedRecordIds.length ? (
                  <span className="badge">
                    {selectedRecordIds.length} selected
                  </span>
                ) : null}
                <button
                  className="button secondary"
                  disabled={!object || recordsPending}
                  onClick={() =>
                    startRecordsTransition(async () => {
                      setRecords(
                        await listShareableRecordsAction(
                          object?.nameSingular ?? "",
                        ),
                      );
                    })
                  }
                  type="button"
                >
                  {recordsPending ? "Loading…" : "Load Twenty records"}
                </button>
              </div>
            </div>
            {records.length ? (
              <div className="grid gap-3">
                <input
                  className="input"
                  onChange={(event) => setRecordSearch(event.target.value)}
                  placeholder="Filter loaded records"
                  type="search"
                  value={recordSearch}
                />
                <div className="record-picker">
                  {visibleRecords.map((record) => (
                    <label key={record.id}>
                      <input
                        checked={selectedRecordIds.includes(record.id)}
                        onChange={(event) =>
                          setSelectedRecordIds((current) =>
                            event.target.checked
                              ? [...new Set([...current, record.id])]
                              : current.filter((id) => id !== record.id),
                          )
                        }
                        type="checkbox"
                      />
                      <span>
                        <strong>{record.label}</strong>
                        <small>{record.id}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
      </section>

      {object ? (
        <section className="portal-form-section" key={`fixed-${objectName}`}>
          <div className="portal-form-section-heading">
            <div>
              <h3>Saved record filters</h3>
              <p>
                Permanently limit this portal to matching records, such as one
                or more products.
              </p>
            </div>
          </div>
          <FixedFilterBuilder
            fields={object.fields}
            initialFilters={initialApplies ? initial?.fixedFilters ?? [] : []}
          />
        </section>
      ) : null}

      <section className="portal-form-section">
        <div className="portal-form-section-heading">
          <div>
            <h3>Display defaults</h3>
            <p>Set the initial ordering and sidebar position.</p>
          </div>
        </div>
        <div className="portal-form-grid three-column">
          <div className="field">
            <label htmlFor="defaultSortField">Default sort field</label>
            <select
              className="input"
              defaultValue={
                initialApplies ? initial?.defaultSortField ?? "" : ""
              }
              id="defaultSortField"
              key={`sort-${objectName}`}
              name="defaultSortField"
            >
              <option value="">No default sorting</option>
              {fields.map((field) => (
                <option key={field.id} value={field.name}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="defaultSortDirection">Sort direction</label>
            <select
              className="input"
              defaultValue={initial?.defaultSortDirection ?? "asc"}
              id="defaultSortDirection"
              name="defaultSortDirection"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="navigationOrder">Navigation order</label>
            <input
              className="input"
              defaultValue={initial?.navigationOrder ?? 0}
              id="navigationOrder"
              name="navigationOrder"
              type="number"
            />
          </div>
        </div>
      </section>

      {object ? (
        <section className="portal-form-section" key={`fields-${objectName}`}>
          <div className="portal-form-section-heading">
            <div>
              <h3>Visible fields and forms</h3>
              <p>
                Check exactly where each field is visible or editable. No
                keyboard shortcuts are required.
              </p>
            </div>
          </div>
          <FieldPermissionsMatrix
            defaults={{
              columns: defaults(initial?.columns),
              detailFields: defaults(initial?.detailFields),
              filterFields: defaults(initial?.filterFields),
              createFields: defaults(initial?.createFields),
              editFields: defaults(initial?.editFields),
            }}
            fields={fields}
          />
        </section>
      ) : null}

      <div className="form-actions">
        <button className="button" disabled={!object} type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
