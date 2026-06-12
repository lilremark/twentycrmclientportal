import type {
  PortalFieldConfig,
  PortalFilterConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import { supportedTwentyFieldTypes } from "@/lib/twenty/validation";

export function selectablePortalFields(fields: TwentyFieldMetadata[]) {
  return fields.filter((field) => supportedTwentyFieldTypes.has(field.type));
}

export function companyScopeFields(fields: TwentyFieldMetadata[]) {
  return [...selectablePortalFields(fields)].sort((left, right) => {
    const score = (field: TwentyFieldMetadata) => {
      const name = field.name.toLowerCase();
      const target = field.relationTargetObjectNameSingular?.toLowerCase();
      if (name === "companyid") return 0;
      if (target === "company") return 1;
      if (name === "company") return 2;
      if (name.includes("company")) return 2;
      if (field.type === "RELATION" || field.type === "UUID") return 3;
      return 4;
    };
    return score(left) - score(right) || left.label.localeCompare(right.label);
  });
}

export function filterOperatorsForType(type: string) {
  switch (type) {
    case "SELECT":
    case "BOOLEAN":
    case "UUID":
    case "RELATION":
      return ["eq", "neq"];
    case "NUMBER":
    case "NUMERIC":
    case "CURRENCY":
    case "DATE":
    case "DATE_TIME":
      return ["eq", "neq", "gt", "gte", "lt", "lte"];
    case "MULTI_SELECT":
      return ["containsAny"];
    default:
      return ["contains", "startsWith", "eq", "neq"];
  }
}

export function defaultFilterOperator(
  field: TwentyFieldMetadata,
  config: PortalFilterConfig,
) {
  const preferred =
    field.type === "TEXT"
      ? "contains"
      : field.type === "MULTI_SELECT"
        ? "containsAny"
        : "eq";
  return config.operators.includes(preferred)
    ? preferred
    : config.operators[0] ?? "eq";
}

export function fieldConfigsFromNames(
  names: string[],
  fields: TwentyFieldMetadata[],
): PortalFieldConfig[] {
  const metadata = new Map(fields.map((field) => [field.name, field]));
  return [...new Set(names)]
    .map((name) => metadata.get(name))
    .filter((field): field is TwentyFieldMetadata => Boolean(field))
    .map((field) => ({ name: field.name, label: field.label }));
}

export function filterConfigsFromNames(
  names: string[],
  fields: TwentyFieldMetadata[],
): PortalFilterConfig[] {
  const metadata = new Map(fields.map((field) => [field.name, field]));
  return [...new Set(names)]
    .map((name) => metadata.get(name))
    .filter((field): field is TwentyFieldMetadata => Boolean(field))
    .map((field) => ({
      name: field.name,
      label: field.label,
      operators: filterOperatorsForType(field.type),
    }));
}
