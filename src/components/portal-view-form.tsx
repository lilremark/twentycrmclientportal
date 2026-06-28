"use client";

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Columns3,
  GripVertical,
  LayoutPanelTop,
  LockKeyhole,
  PieChart,
  Plus,
  Sigma,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { listShareableRecordsAction } from "@/app/actions/admin";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  PortalDashboardWidget,
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
import {
  dashboardGroupFields,
  dashboardMetricFields,
  normalizeDashboardLayout,
  type DashboardResult,
} from "@/lib/portal-dashboard";
import { DashboardReportSurface } from "@/components/dashboard-report-surface";

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
  recordTitleField: string | null;
  createFields: PortalFieldConfig[];
  editFields: PortalFieldConfig[];
  defaultSortField: string | null;
  defaultSortDirection: string;
  formatSelectValues: boolean;
  dashboardWidgets: PortalDashboardWidget[];
  navigationOrder: number;
};

type ViewFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialViewFormState: ViewFormState = {
  status: "idle",
  message: "",
};

function FloatingToast({ state }: { state: ViewFormState }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      className={`toast-message ${state.status}`}
      role="status"
    >
      {state.message}
    </div>
  );
}

function selectedNames(items?: Array<{ name: string }>) {
  return items?.map((item) => item.name) ?? [];
}

const permissionColumns = [
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
          {fields.map((field) => {
            const isWritable =
              field.type !== "FILE" &&
              field.type !== "FILES" &&
              (field.type !== "RELATION" ||
                field.relationType === "MANY_TO_ONE");
            return (
              <div className="field-permissions-row" key={field.id} role="row">
                <div>
                  <strong>{field.label}</strong>
                  <span>
                    {field.name} · {field.type.replaceAll("_", " ")}
                  </span>
                </div>
                {permissionColumns.map((column) => {
                  const isWriteColumn =
                    column.name === "createFields" ||
                    column.name === "editFields";
                  const disabled = isWriteColumn && !isWritable;
                  return (
                    <label
                      className="permission-checkbox"
                      key={column.name}
                      title={
                        disabled
                          ? "Twenty does not support writing this field from the parent record."
                          : `${column.label}: ${field.label}`
                      }
                    >
                      <input
                        aria-label={`${field.label}: ${column.label}`}
                        defaultChecked={
                          !disabled &&
                          defaults[column.name].includes(field.name)
                        }
                        disabled={disabled}
                        name={column.name}
                        type="checkbox"
                        value={field.name}
                      />
                      <span aria-hidden="true" />
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ColumnOrderEditor({
  fields,
  initialColumns,
}: {
  fields: ReturnType<typeof selectablePortalFields>;
  initialColumns: string[];
}) {
  const validNames = new Set(fields.map((field) => field.name));
  const [selected, setSelected] = useState<string[]>(
    initialColumns.filter((name) => validNames.has(name)),
  );
  const [draggedName, setDraggedName] = useState<string | null>(null);
  const [dropTargetName, setDropTargetName] = useState<string | null>(null);
  const metadata = new Map(fields.map((field) => [field.name, field]));

  const toggle = (name: string, checked: boolean) => {
    setSelected((current) =>
      checked
        ? [...current, name].filter(
            (item, index, values) => values.indexOf(item) === index,
          )
        : current.filter((item) => item !== name),
    );
  };
  const move = (name: string, direction: -1 | 1) => {
    setSelected((current) => {
      const index = current.indexOf(name);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };
  const moveToPosition = (name: string, targetName: string) => {
    if (name === targetName) return;
    setSelected((current) => {
      const fromIndex = current.indexOf(name);
      const toIndex = current.indexOf(targetName);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  return (
    <div className="column-order-editor">
      {selected.map((name, index) => {
        const field = metadata.get(name);
        if (!field) return null;
        return (
          <div
            className={[
              "column-order-row",
              draggedName === name ? "is-dragging" : "",
              dropTargetName === name && draggedName !== name
                ? "is-drop-target"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={name}
            onDragEnter={(event) => {
              event.preventDefault();
              setDropTargetName(name);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const dragged = event.dataTransfer.getData("text/plain");
              if (dragged) moveToPosition(dragged, name);
              setDraggedName(null);
              setDropTargetName(null);
            }}
          >
            <input name="columns" type="hidden" value={name} />
            <button
              aria-label={`Drag ${field.label}`}
              className="column-drag-handle"
              draggable
              onDragEnd={() => {
                setDraggedName(null);
                setDropTargetName(null);
              }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", name);
                setDraggedName(name);
              }}
              type="button"
            >
              <GripVertical size={15} />
              <span>{index + 1}</span>
            </button>
            <div>
              <strong>{field.label}</strong>
              <span>{field.name}</span>
            </div>
            <div className="column-order-actions">
              <button
                aria-label={`Move ${field.label} up`}
                className="icon-button"
                disabled={index === 0}
                onClick={() => move(name, -1)}
                type="button"
              >
                <ArrowUp size={15} />
              </button>
              <button
                aria-label={`Move ${field.label} down`}
                className="icon-button"
                disabled={index === selected.length - 1}
                onClick={() => move(name, 1)}
                type="button"
              >
                <ArrowDown size={15} />
              </button>
              <button
                aria-label={`Remove ${field.label}`}
                className="icon-button danger"
                onClick={() => toggle(name, false)}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}
      {!selected.length ? (
        <div className="fixed-filter-empty">
          <strong>No table columns selected</strong>
          <p>Choose at least one column below to render the portal table.</p>
        </div>
      ) : null}
      <div className="column-picker-grid">
        {fields.map((field) => (
          <label key={field.id}>
            <input
              checked={selected.includes(field.name)}
              onChange={(event) => toggle(field.name, event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>{field.label}</strong>
              <small>{field.type.replaceAll("_", " ")}</small>
            </span>
          </label>
        ))}
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
                            {operatorLabels[filter.operator] ?? filter.operator}
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
                                  checked={selectedValues.includes(
                                    option.value,
                                  )}
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

type DashboardWidgetDraft = PortalDashboardWidget & { id: string };

const widgetIcons = {
  number: Sigma,
  bar: BarChart3,
  donut: PieChart,
};

function DashboardWidgetBuilder({
  fields,
  initialWidgets,
  activeTab,
  setActiveTab,
  formPending,
  submitLabel,
}: {
  fields: TwentyFieldMetadata[];
  initialWidgets: PortalDashboardWidget[];
  activeTab: "general" | "reports";
  setActiveTab: (tab: "general" | "reports") => void;
  formPending: boolean;
  submitLabel: string;
}) {
  const metricFields = dashboardMetricFields(fields);
  const groupFields = dashboardGroupFields(fields);
  const [widgets, setWidgets] = useState<DashboardWidgetDraft[]>(
    initialWidgets.map((widget, index) => ({
      ...widget,
      id: widget.id || `initial-${index}`,
    })),
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const updateWidget = (id: string, update: Partial<DashboardWidgetDraft>) => {
    setWidgets((current) =>
      current.map((widget) =>
        widget.id === id ? { ...widget, ...update } : widget,
      ),
    );
  };
  const addWidget = () => {
    setWidgets((current) => [
      ...current,
      {
        id: `widget-${Date.now()}-${current.length}`,
        type: "number",
        label: "Total records",
        aggregate: "count",
      },
    ]);
  };
  const previewItems = widgets.map((widget, index): DashboardResult => {
    const layout = normalizeDashboardLayout(widget.layout, widget.type, index);
    if (widget.type === "number") {
      return {
        id: widget.id,
        type: widget.type,
        label: widget.label || "Main number",
        value: widget.aggregate === "count" ? "128" : "42,500",
        layout,
      };
    }

    return {
      id: widget.id,
      type: widget.type,
      label: widget.label || "Chart",
      total: 128,
      layout,
      points: [
        { label: "Active", value: 68 },
        { label: "Pending", value: 37 },
        { label: "Closed", value: 23 },
      ],
    };
  });

  return (
    <div className="dashboard-widget-summary-view">
      {widgets.map((widget, index) => (
        <input
          key={widget.id}
          name="dashboardWidgets"
          type="hidden"
          value={JSON.stringify({
            id: widget.id,
            type: widget.type,
            label: widget.label,
            aggregate: widget.aggregate,
            field: widget.aggregate === "count" ? "" : widget.field,
            groupBy: widget.type === "number" ? "" : widget.groupBy,
            layout: normalizeDashboardLayout(widget.layout, widget.type, index),
          })}
        />
      ))}

      {activeTab === "general" ? (
        <div className="dashboard-summary-card">
          <div className="dashboard-summary-info">
            <strong>Reports dashboard configuration</strong>
            <p className="field-help">
              {widgets.length === 0
                ? "No widgets configured yet. Add main numbers and charts to display on the client portal's reports dashboard."
                : `${widgets.length} widget${widgets.length === 1 ? "" : "s"} configured.`}
            </p>
            {widgets.length > 0 && (
              <div className="dashboard-summary-badge-list">
                {widgets.map((widget, index) => {
                  const Icon = widgetIcons[widget.type];
                  return (
                    <span
                      key={widget.id}
                      className="badge dashboard-summary-badge"
                    >
                      <Icon size={12} />
                      {widget.label || `Widget ${index + 1}`}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <button
            className="button secondary"
            onClick={() => setActiveTab("reports")}
            type="button"
          >
            <SlidersHorizontal size={15} />
            Configure in Reports Tab
          </button>
        </div>
      ) : (
        <div className="dashboard-inline-body">
          <div
            className="dashboard-inline-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "16px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: "800" }}>
                Visual Layout Canvas
              </h3>
              <p className="field-help" style={{ margin: "2px 0 0" }}>
                Drag and resize widgets directly on the canvas below. Click
                &quot;Manage Widgets&quot; to configure widget metrics.
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => setIsModalOpen(true)}
              type="button"
              style={{ flexShrink: 0 }}
            >
              <SlidersHorizontal size={15} />
              Manage Widgets
            </button>
          </div>

          <div className="dashboard-modal-right" style={{ width: "100%" }}>
            {previewItems.length ? (
              <div
                className="dashboard-modal-canvas-wrapper"
                style={{ minHeight: "680px" }}
              >
                <DashboardReportSurface
                  editable
                  items={previewItems}
                  onLayoutChange={(layouts) =>
                    setWidgets((current) =>
                      current.map((widget, index) => ({
                        ...widget,
                        layout:
                          layouts[widget.id] ??
                          normalizeDashboardLayout(
                            widget.layout,
                            widget.type,
                            index,
                          ),
                      })),
                    )
                  }
                  title="Default client report layout"
                />
              </div>
            ) : (
              <div
                className="fixed-filter-empty"
                style={{
                  minHeight: "360px",
                  display: "grid",
                  placeContent: "center",
                }}
              >
                <strong>Canvas is empty</strong>
                <p>
                  Click &quot;Manage Widgets&quot; above to add widgets and see
                  them in this layout preview.
                </p>
              </div>
            )}
          </div>

          <div
            className="form-actions"
            style={{
              marginTop: "24px",
              gap: "12px",
              justifyContent: "flex-end",
            }}
          >
            <button
              className="button secondary"
              onClick={() => setActiveTab("general")}
              type="button"
            >
              Back to General Settings
            </button>
            <button className="button" disabled={formPending} type="submit">
              {formPending ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="confirmation-layer">
          <button
            aria-label="Close modal"
            className="confirmation-backdrop"
            onClick={() => setIsModalOpen(false)}
            type="button"
          />
          <div className="dashboard-modal-card widget-settings-modal">
            <header className="dashboard-modal-header">
              <div>
                <h2
                  style={{ margin: 0, fontSize: "1.1rem", fontWeight: "750" }}
                >
                  Manage Widgets
                </h2>
                <p className="field-help" style={{ margin: "2px 0 0" }}>
                  Add, configure, or remove widgets on your reports dashboard.
                </p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </header>

            <div
              className="dashboard-widget-modal-body"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                flex: 1,
                padding: "16px 0",
                overflowY: "auto",
                minHeight: 0,
              }}
            >
              {widgets.length ? (
                <div
                  className="dashboard-widget-list"
                  style={{ display: "grid", gap: "16px" }}
                >
                  {widgets.map((widget, index) => {
                    const Icon = widgetIcons[widget.type];
                    return (
                      <div
                        className="dashboard-widget-row"
                        key={widget.id}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          padding: "16px",
                          background: "var(--surface-subtle)",
                        }}
                      >
                        <div
                          className="dashboard-widget-row-heading"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              className="dashboard-widget-icon"
                              style={{
                                display: "inline-flex",
                                padding: "6px",
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                              }}
                            >
                              <Icon size={16} />
                            </span>
                            <strong style={{ fontSize: "0.84rem" }}>
                              Widget {index + 1}
                            </strong>
                          </div>
                          <button
                            aria-label={`Remove widget ${index + 1}`}
                            className="icon-button danger"
                            onClick={() =>
                              setWidgets((current) =>
                                current.filter((item) => item.id !== widget.id),
                              )
                            }
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="dashboard-widget-controls">
                          <div className="field">
                            <label htmlFor={`dashboard-label-${widget.id}`}>
                              Label
                            </label>
                            <input
                              className="input"
                              id={`dashboard-label-${widget.id}`}
                              onChange={(event) =>
                                updateWidget(widget.id, {
                                  label: event.target.value,
                                })
                              }
                              required
                              value={widget.label}
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`dashboard-type-${widget.id}`}>
                              Type
                            </label>
                            <select
                              className="input"
                              id={`dashboard-type-${widget.id}`}
                              onChange={(event) =>
                                updateWidget(widget.id, {
                                  type: event.target
                                    .value as PortalDashboardWidget["type"],
                                  groupBy:
                                    event.target.value === "number"
                                      ? undefined
                                      : widget.groupBy,
                                })
                              }
                              value={widget.type}
                            >
                              <option value="number">Main number</option>
                              <option value="bar">Bar chart</option>
                              <option value="donut">Donut chart</option>
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`dashboard-aggregate-${widget.id}`}>
                              Calculation
                            </label>
                            <select
                              className="input"
                              id={`dashboard-aggregate-${widget.id}`}
                              onChange={(event) =>
                                updateWidget(widget.id, {
                                  aggregate: event.target
                                    .value as PortalDashboardWidget["aggregate"],
                                  field:
                                    event.target.value === "count"
                                      ? undefined
                                      : widget.field,
                                })
                              }
                              value={widget.aggregate}
                            >
                              <option value="count">Record count</option>
                              <option value="sum">Sum</option>
                              <option value="average">Average</option>
                            </select>
                          </div>
                          {widget.aggregate !== "count" ? (
                            <div className="field">
                              <label htmlFor={`dashboard-field-${widget.id}`}>
                                Number field
                              </label>
                              <select
                                className="input"
                                id={`dashboard-field-${widget.id}`}
                                onChange={(event) =>
                                  updateWidget(widget.id, {
                                    field: event.target.value || undefined,
                                  })
                                }
                                required
                                value={widget.field ?? ""}
                              >
                                <option value="">Choose a number field</option>
                                {metricFields.map((field) => (
                                  <option key={field.id} value={field.name}>
                                    {field.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                          {widget.type !== "number" ? (
                            <div className="field">
                              <label htmlFor={`dashboard-group-${widget.id}`}>
                                Group by
                              </label>
                              <select
                                className="input"
                                id={`dashboard-group-${widget.id}`}
                                onChange={(event) =>
                                  updateWidget(widget.id, {
                                    groupBy: event.target.value || undefined,
                                  })
                                }
                                required
                                value={widget.groupBy ?? ""}
                              >
                                <option value="">Choose a group field</option>
                                {groupFields.map((field) => (
                                  <option key={field.id} value={field.name}>
                                    {field.label} ·{" "}
                                    {field.type.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="fixed-filter-empty"
                  style={{ margin: "24px 0" }}
                >
                  <strong>No dashboard widgets</strong>
                  <p>
                    Add main numbers and charts to display on the client
                    portal&apos;s reports dashboard.
                  </p>
                </div>
              )}

              <button
                className="button secondary"
                style={{ width: "100%", marginTop: "4px" }}
                disabled={!fields.length}
                onClick={addWidget}
                type="button"
              >
                <Plus size={16} />
                Add widget
              </button>
            </div>

            <footer
              className="dashboard-modal-footer"
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "16px",
              }}
            >
              <button
                className="button"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                Apply Changes
              </button>
            </footer>
          </div>
        </div>
      )}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "reports" ? "reports" : "general";
  const setActiveTab = (tab: "general" | "reports") => {
    router.push(`?tab=${tab}`);
  };
  const [objectName, setObjectName] = useState(
    initial?.objectNameSingular ?? "",
  );
  const [activeSection, setActiveSection] = useState<
    "basics" | "access" | "fields" | "presentation"
  >("basics");
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
  const [formState, formAction, formPending] = useActionState(
    async (
      _previousState: ViewFormState,
      formData: FormData,
    ): Promise<ViewFormState> => {
      try {
        await action(formData);
        return {
          status: "success",
          message: initial
            ? "Portal view changes have been saved."
            : "Portal view has been created.",
        };
      } catch (error) {
        if (isRedirectError(error)) {
          throw error;
        }
        return {
          status: "error",
          message:
            error instanceof Error ? error.message : "Could not save view.",
        };
      }
    },
    initialViewFormState,
  );
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
    <form action={formAction} className="card form-card portal-view-form">
      {formState.status !== "idle" ? (
        <FloatingToast
          key={`${formState.status}:${formState.message}`}
          state={formState}
        />
      ) : null}

      <div style={{ display: activeTab === "general" ? "contents" : "none" }}>
        <div>
          <h2 className="text-lg font-bold">
            {initial ? `Edit ${initial.label}` : "Create a portal view"}
          </h2>
          <p className="mt-1 text-sm text-[#68758a]">
            Choose an object, then select the fields clients can see, filter,
            and edit. API names are filled from synchronized Twenty metadata.
          </p>
        </div>

        <nav
          aria-label="Portal view setup stages"
          className="builder-stage-nav"
        >
          {[
            { id: "basics", label: "Basics", icon: LayoutPanelTop },
            { id: "access", label: "Access", icon: LockKeyhole },
            { id: "fields", label: "Fields", icon: Columns3 },
            {
              id: "presentation",
              label: "Presentation",
              icon: SlidersHorizontal,
            },
          ].map((stage) => {
            const Icon = stage.icon;
            return (
              <button
                aria-current={activeSection === stage.id ? "step" : undefined}
                className={activeSection === stage.id ? "active" : ""}
                key={stage.id}
                onClick={() => {
                  const next = stage.id as typeof activeSection;
                  setActiveSection(next);
                  document
                    .getElementById(`builder-${next}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                type="button"
              >
                <Icon size={15} />
                <span>{stage.label}</span>
              </button>
            );
          })}
        </nav>

        {!objects.length ? (
          <p className="error text-sm">
            Synchronize Twenty metadata before creating a portal view.
          </p>
        ) : null}

        <section
          className="portal-form-section builder-stage"
          id="builder-basics"
        >
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

        <section
          className="portal-form-section builder-stage"
          id="builder-access"
        >
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
                  <option value="">
                    Choose the Person relation or ID field
                  </option>
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
                    <p>
                      Load the selected object, then choose the records to
                      share.
                    </p>
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
              initialFilters={
                initialApplies ? (initial?.fixedFilters ?? []) : []
              }
            />
          </section>
        ) : null}

        {object ? (
          <section className="portal-form-section">
            <div className="portal-form-section-heading">
              <div>
                <h3>Table columns</h3>
                <p>Select the portal table columns and arrange their order.</p>
              </div>
            </div>
            <ColumnOrderEditor
              fields={fields}
              initialColumns={defaults(initial?.columns)}
            />
          </section>
        ) : null}
      </div>

      {object ? (
        <section
          className={activeTab === "general" ? "portal-form-section" : ""}
          key={`dashboard-${objectName}`}
        >
          {activeTab === "general" && (
            <div className="portal-form-section-heading">
              <div>
                <h3>Reports dashboard</h3>
                <p>Add the main numbers and charts clients should see.</p>
              </div>
            </div>
          )}
          <DashboardWidgetBuilder
            activeTab={activeTab}
            fields={fields}
            initialWidgets={
              initialApplies ? (initial?.dashboardWidgets ?? []) : []
            }
            setActiveTab={setActiveTab}
            formPending={formPending}
            submitLabel={submitLabel}
          />
        </section>
      ) : null}
      {activeTab === "reports" && !object ? (
        <section className="portal-form-section">
          <div
            className="fixed-filter-empty"
            style={{
              minHeight: "320px",
              display: "grid",
              placeContent: "center",
              width: "100%",
            }}
          >
            <strong>No data source selected</strong>
            <p>
              Please choose a Twenty object under the General Settings tab first
              to configure its Reports Dashboard.
            </p>
          </div>
        </section>
      ) : null}

      <div style={{ display: activeTab === "general" ? "contents" : "none" }}>
        <section
          className="portal-form-section builder-stage"
          id="builder-presentation"
        >
          <div className="portal-form-section-heading">
            <div>
              <h3>Display defaults</h3>
              <p>Set the initial ordering and sidebar position.</p>
            </div>
          </div>
          <div className="portal-form-grid three-column">
            <div className="field">
              <label htmlFor="recordTitleField">Sidebar header field</label>
              <select
                className="input"
                defaultValue={
                  initialApplies
                    ? (initial?.recordTitleField ??
                      fields.find((field) => field.name === "name")?.name ??
                      "")
                    : (fields.find((field) => field.name === "name")?.name ??
                      "")
                }
                id="recordTitleField"
                key={`title-${objectName}`}
                name="recordTitleField"
              >
                <option value="">Automatic first visible value</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.name}>
                    {field.label}
                  </option>
                ))}
              </select>
              <span className="field-help">
                Used as the title when a record opens in the right sidebar.
              </span>
            </div>
            <div className="field">
              <label htmlFor="defaultSortField">Default sort field</label>
              <select
                className="input"
                defaultValue={
                  initialApplies ? (initial?.defaultSortField ?? "") : ""
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
            <label className="settings-toggle settings-span">
              <input
                defaultChecked={initial?.formatSelectValues ?? true}
                name="formatSelectValues"
                type="checkbox"
              />
              <span>
                <strong>Use readable Select labels</strong>
                <small>
                  Show synchronized labels and clean capitalization instead of
                  raw API values for Select and Multi-select fields.
                </small>
              </span>
            </label>
          </div>
        </section>

        {object ? (
          <section
            className="portal-form-section builder-stage"
            id="builder-fields"
            key={`fields-${objectName}`}
          >
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
          <button
            className="button"
            disabled={!object || formPending}
            type="submit"
          >
            {formPending ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
