import Link from "next/link";

import type {
  PortalFilterConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import { defaultFilterOperator } from "@/lib/portal-view-config";

const operatorLabels: Record<string, string> = {
  eq: "Equals",
  neq: "Does not equal",
  contains: "Contains",
  startsWith: "Starts with",
  in: "Includes",
  containsAny: "Contains",
  gt: "Greater than",
  gte: "At least",
  lt: "Less than",
  lte: "At most",
};

function filterInputType(type: string) {
  if (type === "NUMBER" || type === "NUMERIC" || type === "CURRENCY") {
    return "number";
  }
  if (type === "DATE") return "date";
  if (type === "DATE_TIME") return "datetime-local";
  return "text";
}

export function PortalFilterForm({
  fields,
  filters,
  query,
  viewSlug,
}: {
  fields: TwentyFieldMetadata[];
  filters: PortalFilterConfig[];
  query: Record<string, string | string[] | undefined>;
  viewSlug: string;
}) {
  const metadata = new Map(fields.map((field) => [field.name, field]));

  return (
    <form className="card grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
      {filters.map((config) => {
        const field = metadata.get(config.name);
        if (!field) return null;
        const value = String(query[`f_${field.name}`] ?? "");
        const defaultOperator = defaultFilterOperator(field, config);
        const selectedOperator = String(
          query[`op_${field.name}`] ?? defaultOperator,
        );
        const label = config.label ?? field.label;

        if (field.type === "SELECT" || field.type === "MULTI_SELECT") {
          return (
            <div className="field" key={field.id}>
              <label htmlFor={`f_${field.name}`}>{label}</label>
              <input
                name={`op_${field.name}`}
                type="hidden"
                value={defaultOperator}
              />
              <select
                className="input"
                defaultValue={value}
                id={`f_${field.name}`}
                name={`f_${field.name}`}
              >
                <option value="">Any</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === "BOOLEAN") {
          return (
            <div className="field" key={field.id}>
              <label htmlFor={`f_${field.name}`}>{label}</label>
              <input name={`op_${field.name}`} type="hidden" value="eq" />
              <select
                className="input"
                defaultValue={value}
                id={`f_${field.name}`}
                name={`f_${field.name}`}
              >
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          );
        }

        return (
          <div className="field" key={field.id}>
            <label htmlFor={`f_${field.name}`}>{label}</label>
            <div className="grid grid-cols-[130px_1fr] gap-2">
              <select
                className="input"
                defaultValue={selectedOperator}
                name={`op_${field.name}`}
              >
                {config.operators.map((operator) => (
                  <option key={operator} value={operator}>
                    {operatorLabels[operator] ?? operator}
                  </option>
                ))}
              </select>
              <input
                className="input"
                defaultValue={value}
                id={`f_${field.name}`}
                name={`f_${field.name}`}
                step={
                  ["NUMBER", "NUMERIC", "CURRENCY"].includes(field.type)
                    ? "any"
                    : undefined
                }
                type={filterInputType(field.type)}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-end gap-2">
        <button className="button" type="submit">
          Apply filters
        </button>
        <Link className="button secondary" href={`/portal/${viewSlug}`}>
          Clear
        </Link>
      </div>
    </form>
  );
}
