import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";

function inputType(type: string) {
  if (type === "NUMBER" || type === "NUMERIC" || type === "CURRENCY") {
    return "number";
  }
  if (type === "DATE") return "date";
  if (type === "DATE_TIME") return "datetime-local";
  return "text";
}

function defaultValue(value: unknown, type: string) {
  if (value === null || value === undefined) return "";
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
}: {
  fields: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
  values?: Record<string, unknown>;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const metadataByName = new Map(
    metadataFields.map((field) => [field.name, field]),
  );
  return (
    <form action={action} className="card grid gap-5 p-6">
      {fields.map((config) => {
        const field = metadataByName.get(config.name);
        if (!field) return null;
        const label = config.label ?? field.label;
        if (field.type === "BOOLEAN") {
          return (
            <div className="field" key={field.id}>
              <label htmlFor={field.name}>{label}</label>
              <select
                className="input"
                defaultValue={String(values[field.name] ?? false)}
                id={field.name}
                name={field.name}
                required={config.required}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          );
        }
        if (field.type === "SELECT") {
          return (
            <div className="field" key={field.id}>
              <label htmlFor={field.name}>{label}</label>
              <select
                className="input"
                defaultValue={defaultValue(values[field.name], field.type)}
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
              </select>
            </div>
          );
        }
        return (
          <div className="field" key={field.id}>
            <label htmlFor={field.name}>{label}</label>
            <input
              className="input"
              defaultValue={defaultValue(values[field.name], field.type)}
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
              type={inputType(field.type)}
            />
            {field.type === "MULTI_SELECT" ? (
              <span className="text-xs text-[#68758a]">
                Enter comma-separated values.
              </span>
            ) : null}
            {field.type === "RELATION" ? (
              <span className="text-xs text-[#68758a]">
                Enter a record UUID from an approved portal object.
              </span>
            ) : null}
          </div>
        );
      })}
      <button className="button w-fit" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
