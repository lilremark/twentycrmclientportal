"use client";

import { useMemo, useState, useTransition } from "react";

import { listShareableRecordsAction } from "@/app/actions/admin";
import type {
  PortalFieldConfig,
  PortalFilterConfig,
  TwentyObjectMetadata,
} from "@/lib/db/schema";
import {
  companyScopeFields,
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
  createFields: PortalFieldConfig[];
  editFields: PortalFieldConfig[];
  defaultSortField: string | null;
  defaultSortDirection: string;
  navigationOrder: number;
};

function selectedNames(items?: Array<{ name: string }>) {
  return items?.map((item) => item.name) ?? [];
}

function FieldSelect({
  fields,
  label,
  name,
  defaults,
}: {
  fields: ReturnType<typeof selectablePortalFields>;
  label: string;
  name: string;
  defaults: string[];
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select
        className="input min-h-40"
        defaultValue={defaults}
        id={name}
        multiple
        name={name}
      >
        {fields.map((field) => (
          <option key={field.id} value={field.name}>
            {field.label} · {field.type}
          </option>
        ))}
      </select>
      <span className="text-xs text-[#68758a]">
        Hold Ctrl or Command to choose multiple fields.
      </span>
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
  const [scopeMode, setScopeMode] = useState(initial?.scopeMode ?? "records");
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
  const scopeFields = companyScopeFields(object?.fields ?? []);
  const initialApplies = initial?.objectNameSingular === objectName;
  const defaults = (items?: Array<{ name: string }>) =>
    initialApplies ? selectedNames(items) : [];
  const visibleRecords = records.filter((record) =>
    `${record.label} ${record.id}`
      .toLowerCase()
      .includes(recordSearch.toLowerCase()),
  );

  return (
    <form action={action} className="card grid gap-6 p-5">
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="field">
          <label htmlFor="label">Navigation label</label>
          <input
            className="input"
            defaultValue={initial?.label}
            id="label"
            name="label"
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
            required
          />
        </div>
        <div className="field">
          <label htmlFor="objectSearch">Find an object</label>
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
        <div className="field">
          <label htmlFor="scopeMode">Records shared by this portal</label>
          <select
            className="input"
            id="scopeMode"
            name="scopeMode"
            onChange={(event) => setScopeMode(event.target.value)}
            required
            value={scopeMode}
          >
            <option value="records">Only specific record IDs</option>
            <option value="company">All records for a Company</option>
          </select>
        </div>
        {scopeMode === "company" ? (
          <div className="field">
            <label htmlFor="scopeFieldName">Company scope field</label>
            <select
              className="input"
              defaultValue={initialApplies ? initial?.scopeFieldName : ""}
              id="scopeFieldName"
              key={`scope-${objectName}`}
              name="scopeFieldName"
              required
            >
              <option value="">Choose the Company relation</option>
              {scopeFields.map((field) => (
                <option key={field.id} value={field.name}>
                  {field.label} · {field.type}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field md:col-span-2">
            <label>Specific records</label>
            {selectedRecordIds.map((recordId) => (
              <input
                key={recordId}
                name="allowedRecordIds"
                type="hidden"
                value={recordId}
              />
            ))}
            <div className="flex flex-wrap gap-2">
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
                {recordsPending ? "Loading…" : "Load records from Twenty"}
              </button>
              {selectedRecordIds.length ? (
                <span className="badge">
                  {selectedRecordIds.length} selected
                </span>
              ) : null}
            </div>
            {records.length ? (
              <>
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
              </>
            ) : null}
            <span className="text-xs text-[#68758a]">
              Only these records can be listed, opened, or edited.
            </span>
          </div>
        )}
        <div className="field">
          <label htmlFor="defaultSortField">Default sort</label>
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

      {object ? (
        <div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          key={`fields-${objectName}`}
        >
          <FieldSelect
            defaults={defaults(initial?.columns)}
            fields={fields}
            label="Table columns"
            name="columns"
          />
          <FieldSelect
            defaults={defaults(initial?.detailFields)}
            fields={fields}
            label="Detail page fields"
            name="detailFields"
          />
          <FieldSelect
            defaults={defaults(initial?.filterFields)}
            fields={fields}
            label="Available filters"
            name="filterFields"
          />
          <FieldSelect
            defaults={defaults(initial?.createFields)}
            fields={fields}
            label="Create form fields"
            name="createFields"
          />
          <FieldSelect
            defaults={defaults(initial?.editFields)}
            fields={fields}
            label="Edit form fields"
            name="editFields"
          />
        </div>
      ) : null}

      <button
        className="button w-fit"
        disabled={!object}
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}
