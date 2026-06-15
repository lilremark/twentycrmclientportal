import type {
  PortalFixedFilter,
  PortalFilterConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";

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
  "containsAny",
  "gt",
  "gte",
  "lt",
  "lte",
  "is",
]);

function coerceFilterValue(operator: string, value: string) {
  if (operator === "in" || operator === "containsAny") {
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

function buildFieldFilter(
  fieldName: string,
  operator: string,
  value: string,
  metadataFields: TwentyFieldMetadata[],
) {
  const coercedValue = coerceFilterValue(operator, value);
  const field = metadataFields.find((item) => item.name === fieldName);

  if (field?.type === "RELATION") {
    return {
      [fieldName]: {
        id: { [operator]: coercedValue },
      },
    };
  }

  return {
    [fieldName]: {
      [operator]: coercedValue,
    },
  };
}

export function buildPortalScopeFilter(input: {
  scopeMode: string;
  scopeFieldName: string;
  allowedRecordIds: string[];
  twentyPersonId: string | null;
  metadataFields: TwentyFieldMetadata[];
}) {
  if (input.scopeMode === "all") {
    return {};
  }

  if (input.scopeMode === "records") {
    return { id: { in: input.allowedRecordIds } };
  }

  if (!input.twentyPersonId) {
    throw new Error("This portal view requires a client Person.");
  }

  const scopeField = input.metadataFields.find(
    (field) => field.name === input.scopeFieldName,
  );
  return scopeField?.type === "RELATION"
    ? {
        [input.scopeFieldName]: {
          id: { eq: input.twentyPersonId },
        },
      }
    : {
        [input.scopeFieldName]: { eq: input.twentyPersonId },
      };
}

export function buildScopedFilter(input: {
  scopeFieldName?: string;
  twentyPersonId?: string;
  scopeFilter?: Record<string, unknown>;
  fixedFilters?: PortalFixedFilter[];
  metadataFields?: TwentyFieldMetadata[];
  configuredFilters: PortalFilterConfig[];
  requestedFilters: PortalFilterInput[];
}) {
  const allowed = new Map(
    input.configuredFilters.map((field) => [field.name, field]),
  );
  const baseFilter =
    input.scopeFilter ??
    (input.scopeFieldName
      ? { [input.scopeFieldName]: { eq: input.twentyPersonId } }
      : {});
  const filters: Record<string, unknown>[] = Object.keys(baseFilter).length
    ? [baseFilter]
    : [];
  const metadataFields = input.metadataFields ?? [];

  for (const fixed of input.fixedFilters ?? []) {
    if (
      !supportedOperators.has(fixed.operator) ||
      fixed.value.trim() === ""
    ) {
      throw new Error("This portal has an invalid saved record filter.");
    }
    filters.push(
      buildFieldFilter(
        fixed.name,
        fixed.operator,
        fixed.value,
        metadataFields,
      ),
    );
  }

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

    filters.push(
      buildFieldFilter(
        requested.field,
        requested.operator,
        requested.value,
        metadataFields,
      ),
    );
  }

  if (!filters.length) return {};
  return filters.length === 1 ? filters[0] : { and: filters };
}
