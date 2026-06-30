import Link from "next/link";

import { AppSelect } from "@/components/ui/app-select";

import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import { isWritablePortalField } from "@/lib/twenty/validation";

export function recordInputType(type: string) {
  if (type === "NUMBER" || type === "NUMERIC" || type === "CURRENCY") {
    return "number";
  }
  if (type === "DATE") return "date";
  if (type === "DATE_TIME") return "datetime-local";
  return "text";
}

export function recordInputDefaultValue(value: unknown, type: string) {
  if (value === null || value === undefined) return "";
  if (type === "RELATION" && typeof value === "object") {
    const relation = value as Record<string, unknown>;
    if (relation.id) return String(relation.id);
    if (Array.isArray(relation.edges)) {
      return relation.edges
        .map((edge) =>
          edge && typeof edge === "object"
            ? (edge as Record<string, unknown>).node
            : null,
        )
        .map((node) =>
          node && typeof node === "object"
            ? (node as Record<string, unknown>).id
            : null,
        )
        .filter(Boolean)
        .join(", ");
    }
  }
  if (type === "CURRENCY" && typeof value === "object") {
    return String(
      Number((value as Record<string, unknown>).amountMicros ?? 0) / 1_000_000,
    );
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function RecordForm({
  fields,
  metadataFields,
  values = {},
  action,
  submitLabel,
  appearance = "card",
  cancelHref,
}: {
  fields: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
  values?: Record<string, unknown>;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  appearance?: "card" | "panel";
  cancelHref?: string;
}) {
  const metadataByName = new Map(
    metadataFields.map((field) => [field.name, field]),
  );
  return (
    <form
      action={action}
      className={
        appearance === "panel"
          ? "record-panel-form"
          : "card form-card"
      }
    >
      {fields.map((config) => {
        const field = metadataByName.get(config.name);
        if (!field) return null;
        if (!isWritablePortalField(field)) return null;
        const label = config.label ?? field.label;
        if (field.type === "MULTI_SELECT" && field.options?.length) {
          const currentValue = values[field.name];
          const selected = Array.isArray(currentValue)
            ? currentValue.map(String)
            : String(currentValue ?? "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
          return (
            <fieldset className="field" key={field.id}>
              <legend>{label}</legend>
              <div className="option-checkbox-grid">
                {field.options.map((option) => (
                  <label key={option.value}>
                    <input
                      defaultChecked={selected.includes(option.value)}
                      name={field.name}
                      type="checkbox"
                      value={option.value}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }
        if (field.type === "BOOLEAN") {
          return (
            <div className="field" key={field.id}>
              <label htmlFor={field.name}>{label}</label>
              <AppSelect
                className="input"
                defaultValue={String(values[field.name] ?? false)}
                id={field.name}
                name={field.name}
                required={config.required}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </AppSelect>
            </div>
          );
        }
        if (field.type === "SELECT") {
          return (
            <div className="field" key={field.id}>
              <label htmlFor={field.name}>{label}</label>
              <AppSelect
                className="input"
                defaultValue={recordInputDefaultValue(
                  values[field.name],
                  field.type,
                )}
                id={field.name}
                name={field.name}
                required={config.required}
              >
                <option value="">Choose…</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AppSelect>
            </div>
          );
        }
        return (
          <div className="field" key={field.id}>
            <label htmlFor={field.name}>{label}</label>
            <input
              className="input"
              defaultValue={recordInputDefaultValue(
                values[field.name],
                field.type,
              )}
              id={field.name}
              name={field.name}
              required={config.required}
              step={
                field.type === "NUMBER" ||
                field.type === "NUMERIC" ||
                field.type === "CURRENCY"
                  ? "any"
                  : undefined
              }
              type={recordInputType(field.type)}
            />
          </div>
        );
      })}
      <div className="form-actions">
        <button className="button" type="submit">
          {submitLabel}
        </button>
        {cancelHref ? (
          <Link className="button secondary" href={cancelHref} scroll={false}>
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
