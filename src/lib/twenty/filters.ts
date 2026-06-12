import type { PortalFilterConfig } from "@/lib/db/schema";

export type PortalFilterInput = {
  field: string;
  operator: string;
  value: string;
};

const supportedOperators = new Set([
  "eq",
  "neq",
  "contains",
  "startsWith",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
  "is",
]);

function coerceFilterValue(operator: string, value: string) {
  if (operator === "in") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export function buildScopedFilter(input: {
  scopeFieldName: string;
  twentyCompanyId: string;
  configuredFilters: PortalFilterConfig[];
  requestedFilters: PortalFilterInput[];
}) {
  const allowed = new Map(
    input.configuredFilters.map((field) => [field.name, field]),
  );
  const filters: Record<string, unknown>[] = [
    {
      [input.scopeFieldName]: { eq: input.twentyCompanyId },
    },
  ];

  for (const requested of input.requestedFilters) {
    const config = allowed.get(requested.field);
    if (
      !config ||
      !supportedOperators.has(requested.operator) ||
      !config.operators.includes(requested.operator) ||
      requested.value === ""
    ) {
      continue;
    }

    filters.push({
      [requested.field]: {
        [requested.operator]: coerceFilterValue(
          requested.operator,
          requested.value,
        ),
      },
    });
  }

  return filters.length === 1 ? filters[0] : { and: filters };
}
