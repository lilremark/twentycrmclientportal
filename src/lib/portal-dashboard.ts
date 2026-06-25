import type {
  PortalDashboardWidget,
  PortalDashboardWidgetLayout,
  PortalFieldConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import { formatPortalValue } from "@/lib/format-value";

export const dashboardWidgetTypes = ["number", "bar", "donut"] as const;
export const dashboardAggregates = ["count", "sum", "average"] as const;

const numericFieldTypes = new Set(["NUMBER", "NUMERIC", "CURRENCY"]);
const groupableFieldTypes = new Set([
  "TEXT",
  "BOOLEAN",
  "DATE",
  "DATE_TIME",
  "SELECT",
  "MULTI_SELECT",
  "RELATION",
  "UUID",
]);

export type DashboardChartPoint = {
  label: string;
  value: number;
};

export type DashboardResult =
  | {
      id: string;
      type: "number";
      label: string;
      value: string;
      layout: PortalDashboardWidgetLayout;
    }
  | {
      id: string;
      type: "bar" | "donut";
      label: string;
      total: number;
      points: DashboardChartPoint[];
      layout: PortalDashboardWidgetLayout;
    };

const GRID_COLUMNS = 12;

function defaultWidgetSize(type: PortalDashboardWidget["type"]) {
  return type === "number" ? { w: 3, h: 2 } : { w: 6, h: 4 };
}

export function defaultDashboardLayout(
  type: PortalDashboardWidget["type"],
  index: number,
): PortalDashboardWidgetLayout {
  const size = defaultWidgetSize(type);
  const x = (index * size.w) % GRID_COLUMNS;
  const y = Math.floor((index * size.w) / GRID_COLUMNS) * size.h;
  return { x, y, ...size };
}

export function normalizeDashboardLayout(
  layout: PortalDashboardWidget["layout"] | undefined,
  type: PortalDashboardWidget["type"],
  index: number,
): PortalDashboardWidgetLayout {
  const fallback = defaultDashboardLayout(type, index);
  if (!layout) return fallback;
  const w = Math.min(Math.max(Math.round(layout.w || fallback.w), 2), GRID_COLUMNS);
  const h = Math.min(Math.max(Math.round(layout.h || fallback.h), 2), 8);
  return {
    x: Math.min(Math.max(Math.round(layout.x || 0), 0), GRID_COLUMNS - w),
    y: Math.max(Math.round(layout.y || 0), 0),
    w,
    h,
  };
}

function fieldByName(fields: TwentyFieldMetadata[]) {
  return new Map(fields.map((field) => [field.name, field]));
}

export function dashboardMetricFields(fields: TwentyFieldMetadata[]) {
  return fields.filter((field) => numericFieldTypes.has(field.type));
}

export function dashboardGroupFields(fields: TwentyFieldMetadata[]) {
  return fields.filter((field) => groupableFieldTypes.has(field.type));
}

export function dashboardRequiredFields(
  widgets: PortalDashboardWidget[],
  fields: TwentyFieldMetadata[],
): PortalFieldConfig[] {
  const metadata = fieldByName(fields);
  const names = [
    ...new Set(
      widgets.flatMap((widget) => [widget.field, widget.groupBy]).filter(
        (name): name is string => Boolean(name && metadata.has(name)),
      ),
    ),
  ];

  return names.map((name) => ({
    name,
    label: metadata.get(name)?.label,
  }));
}

export function validatePortalDashboardWidgets(
  widgets: PortalDashboardWidget[],
  fields: TwentyFieldMetadata[],
) {
  const metadata = fieldByName(fields);
  const errors: string[] = [];

  for (const widget of widgets) {
    if (!dashboardWidgetTypes.includes(widget.type)) {
      errors.push(`Dashboard widget "${widget.label}" has an invalid type.`);
    }
    if (!dashboardAggregates.includes(widget.aggregate)) {
      errors.push(
        `Dashboard widget "${widget.label}" has an invalid calculation.`,
      );
    }
    if (widget.aggregate !== "count") {
      const field = widget.field ? metadata.get(widget.field) : null;
      if (!field) {
        errors.push(`Dashboard widget "${widget.label}" needs a number field.`);
      } else if (!numericFieldTypes.has(field.type)) {
        errors.push(
          `Dashboard widget "${widget.label}" must calculate a numeric field.`,
        );
      }
    }
    if (widget.type !== "number") {
      const field = widget.groupBy ? metadata.get(widget.groupBy) : null;
      if (!field) {
        errors.push(`Dashboard chart "${widget.label}" needs a group field.`);
      } else if (!groupableFieldTypes.has(field.type)) {
        errors.push(
          `Dashboard chart "${widget.label}" cannot group by ${field.label}.`,
        );
      }
    }
  }

  return errors;
}

function valueToNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "amountMicros" in value &&
    typeof (value as { amountMicros?: unknown }).amountMicros === "number"
  ) {
    return (value as { amountMicros: number }).amountMicros / 1_000_000;
  }
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function aggregateRecords(
  records: Record<string, unknown>[],
  widget: PortalDashboardWidget,
) {
  if (widget.aggregate === "count") return records.length;

  const values = records
    .map((record) => valueToNumber(record[widget.field ?? ""]))
    .filter((value): value is number => value !== null);
  const total = values.reduce((sum, value) => sum + value, 0);
  return widget.aggregate === "average" && values.length
    ? total / values.length
    : total;
}

function groupLabels(value: unknown, field?: TwentyFieldMetadata) {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        formatPortalValue(item, field?.type, {
          selectOptions: field?.options,
          formatSelectValues: true,
        }),
      )
      .filter((label) => label && label !== "—");
  }
  if (
    value &&
    typeof value === "object" &&
    "edges" in value &&
    Array.isArray((value as { edges?: unknown }).edges)
  ) {
    return (value as { edges: Array<{ node?: unknown }> }).edges
      .map((edge) => formatPortalValue(edge.node, field?.type))
      .filter((label) => label && label !== "—");
  }

  const label = formatPortalValue(value, field?.type, {
    selectOptions: field?.options,
    formatSelectValues: true,
  });
  return label && label !== "—" ? [label] : ["Unspecified"];
}

function formatNumber(value: number, widget: PortalDashboardWidget) {
  if (!widget.field) return value.toLocaleString();
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: widget.aggregate === "average" ? 1 : 2,
  }).format(value);
}

export function buildDashboardResults(input: {
  widgets: PortalDashboardWidget[];
  records: Record<string, unknown>[];
  fields: TwentyFieldMetadata[];
}): DashboardResult[] {
  const metadata = fieldByName(input.fields);

  return input.widgets.map((widget, index) => {
    const layout = normalizeDashboardLayout(widget.layout, widget.type, index);
    if (widget.type === "number") {
      const value = aggregateRecords(input.records, widget);
      return {
        id: widget.id,
        type: widget.type,
        label: widget.label,
        value: formatNumber(value, widget),
        layout,
      };
    }

    const groupField = metadata.get(widget.groupBy ?? "");
    const buckets = new Map<string, Record<string, unknown>[]>();
    for (const record of input.records) {
      for (const label of groupLabels(record[widget.groupBy ?? ""], groupField)) {
        buckets.set(label, [...(buckets.get(label) ?? []), record]);
      }
    }
    const points = [...buckets.entries()]
      .map(([label, records]) => ({
        label,
        value: aggregateRecords(records, widget),
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);

    return {
      id: widget.id,
      type: widget.type,
      label: widget.label,
      total: aggregateRecords(input.records, widget),
      points,
      layout,
    };
  });
}
