"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Filter, RotateCcw, SlidersHorizontal, X } from "lucide-react";

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
  clearHref,
  hiddenParams = {},
}: {
  fields: TwentyFieldMetadata[];
  filters: PortalFilterConfig[];
  query: Record<string, string | string[] | undefined>;
  clearHref: string;
  hiddenParams?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const metadata = useMemo(
    () => new Map(fields.map((field) => [field.name, field])),
    [fields],
  );
  const activeCount = filters.filter((config) =>
    String(query[`f_${config.name}`] ?? "").trim(),
  ).length;
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [close, open]);

  return (
    <>
      <div className="portal-filter-toolbar">
        <button
          className="button secondary"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Filter size={15} />
          Filter
          {activeCount ? (
            <span className="filter-count">{activeCount}</span>
          ) : null}
        </button>
        {activeCount ? (
          <div className="active-filter-banner">
            <span>
              <SlidersHorizontal size={14} />
              {activeCount} active filter{activeCount === 1 ? "" : "s"}
            </span>
            <button
              className="button secondary compact-button"
              onClick={() => router.push(clearHref, { scroll: false })}
              type="button"
            >
              <RotateCcw size={13} />
              Disable filter
            </button>
          </div>
        ) : null}
      </div>

      {open
        ? createPortal(
            <div className="filter-panel-layer">
              <button
                aria-label="Close filters"
                className="record-panel-backdrop"
                onClick={close}
                type="button"
              />
              <aside
                aria-label="Filter records"
                aria-modal="true"
                className="filter-side-panel"
                ref={panelRef}
                role="dialog"
                tabIndex={-1}
              >
                <header className="filter-panel-header">
                  <div>
                    <p className="eyebrow">Record controls</p>
                    <h2>Filter records</h2>
                    <p>Narrow this portal table using shared fields.</p>
                  </div>
                  <button
                    aria-label="Close filters"
                    className="icon-button"
                    onClick={close}
                    type="button"
                  >
                    <X size={17} />
                  </button>
                </header>
                <form
                  className="filter-panel-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const next = new URLSearchParams();
                    for (const [name, value] of Object.entries(hiddenParams)) {
                      next.set(name, value);
                    }
                    for (const config of filters) {
                      const value = String(
                        formData.get(`f_${config.name}`) ?? "",
                      ).trim();
                      if (!value) continue;
                      next.set(`f_${config.name}`, value);
                      const operator = String(
                        formData.get(`op_${config.name}`) ?? "",
                      ).trim();
                      if (operator) next.set(`op_${config.name}`, operator);
                    }
                    close();
                    router.push(
                      `${pathname}${next.size ? `?${next.toString()}` : ""}`,
                      { scroll: false },
                    );
                  }}
                >
                  <div className="filter-panel-fields">
                    {filters.map((config) => {
                      const field = metadata.get(config.name);
                      if (!field) return null;
                      const value = String(query[`f_${field.name}`] ?? "");
                      const defaultOperator = defaultFilterOperator(
                        field,
                        config,
                      );
                      const selectedOperator = String(
                        query[`op_${field.name}`] ?? defaultOperator,
                      );
                      const label = config.label ?? field.label;

                      if (
                        field.type === "SELECT" ||
                        field.type === "MULTI_SELECT"
                      ) {
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
                                <option
                                  key={option.value}
                                  value={option.value}
                                >
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
                            <input
                              name={`op_${field.name}`}
                              type="hidden"
                              value="eq"
                            />
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
                          <div className="control-pair">
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
                                ["NUMBER", "NUMERIC", "CURRENCY"].includes(
                                  field.type,
                                )
                                  ? "any"
                                  : undefined
                              }
                              type={filterInputType(field.type)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <footer className="filter-panel-actions">
                    <button
                      className="button secondary"
                      onClick={() => {
                        close();
                        router.push(clearHref, { scroll: false });
                      }}
                      type="button"
                    >
                      <RotateCcw size={14} />
                      Clear
                    </button>
                    <button className="button" type="submit">
                      Apply filter
                    </button>
                  </footer>
                </form>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
