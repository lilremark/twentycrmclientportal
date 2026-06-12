"use client";

import { useMemo, useState } from "react";

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
  const object = useMemo(
    () => objects.find((item) => item.nameSingular === objectName),
    [objectName, objects],
  );
  const fields = selectablePortalFields(object?.fields ?? []);
  const scopeFields = companyScopeFields(object?.fields ?? []);
  const initialApplies = initial?.objectNameSingular === objectName;
  const defaults = (items?: Array<{ name: string }>) =>
    initialApplies ? selectedNames(items) : [];

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
          <label htmlFor="objectNameSingular">Twenty object</label>
          <select
            className="input"
            id="objectNameSingular"
            name="objectNameSingular"
            onChange={(event) => setObjectName(event.target.value)}
            required
            value={objectName}
          >
            <option value="">Choose an object</option>
            {objects.map((item) => (
              <option key={item.id} value={item.nameSingular}>
                {item.labelSingular}
              </option>
            ))}
          </select>
        </div>
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
