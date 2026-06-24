"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  TableProperties,
  X,
} from "lucide-react";

type ExportColumn = {
  name: string;
  label: string;
};

type ExportScope = "filtered" | "all";
type ExportFormat = "csv" | "xlsx";

export function PortalExportButton({
  columns,
  currentQueryString,
  objectLabel,
  viewSlug,
}: {
  columns: ExportColumn[];
  currentQueryString: string;
  objectLabel: string;
  viewSlug: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [selectedColumns, setSelectedColumns] = useState(
    () => new Set(columns.map((column) => column.name)),
  );
  const close = useCallback(() => {
    setOpen(false);
    setStep(0);
  }, []);
  const selectedCount = selectedColumns.size;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();
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

  const toggleColumn = (name: string) => {
    setSelectedColumns((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const exportHref = () => {
    const params = new URLSearchParams();
    if (scope === "filtered") {
      const current = new URLSearchParams(currentQueryString);
      for (const [key, value] of current) {
        if (
          key === "saved" ||
          key === "sort" ||
          key === "direction" ||
          key.startsWith("f_") ||
          key.startsWith("op_")
        ) {
          params.append(key, value);
        }
      }
    } else {
      const current = new URLSearchParams(currentQueryString);
      const sort = current.get("sort");
      const direction = current.get("direction");
      if (sort) params.set("sort", sort);
      if (direction) params.set("direction", direction);
    }
    params.set("scope", scope);
    params.set("format", format);
    for (const column of columns) {
      if (selectedColumns.has(column.name)) {
        params.append("column", column.name);
      }
    }
    return `/api/portal/${encodeURIComponent(viewSlug)}/export?${params.toString()}`;
  };

  const steps = ["Records", "Columns", "Format"];

  return (
    <>
      <button
        className="button secondary"
        disabled={!columns.length}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Download size={15} />
        Export
      </button>
      {open
        ? createPortal(
            <div className="note-modal-layer export-modal-layer">
              <button
                aria-label="Close export"
                className="note-modal-backdrop"
                onClick={close}
                type="button"
              />
              <div
                aria-labelledby="export-modal-title"
                aria-modal="true"
                className="note-modal-card export-modal-card"
                ref={modalRef}
                role="dialog"
                tabIndex={-1}
              >
                <div className="note-modal-heading">
                  <div>
                    <p className="eyebrow">Portal export</p>
                    <h2 id="export-modal-title">Export {objectLabel}</h2>
                  </div>
                  <button
                    aria-label="Close export"
                    className="icon-button"
                    onClick={close}
                    type="button"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="export-steps" aria-label="Export steps">
                  {steps.map((label, index) => (
                    <span
                      className={[
                        "export-step",
                        index === step ? "is-active" : "",
                        index < step ? "is-complete" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={label}
                    >
                      {index + 1}. {label}
                    </span>
                  ))}
                </div>

                <div className="export-modal-body">
                  {step === 0 ? (
                    <div className="export-choice-grid">
                      <label className="export-choice">
                        <input
                          checked={scope === "filtered"}
                          name="export-scope"
                          onChange={() => setScope("filtered")}
                          type="radio"
                        />
                        <Filter size={18} />
                        <span>
                          <strong>Current view</strong>
                          <small>
                            Export the portal records using the active filters,
                            saved view, and sort.
                          </small>
                        </span>
                      </label>
                      <label className="export-choice">
                        <input
                          checked={scope === "all"}
                          name="export-scope"
                          onChange={() => setScope("all")}
                          type="radio"
                        />
                        <Database size={18} />
                        <span>
                          <strong>All shared records</strong>
                          <small>
                            Ignore the active filters and export every record
                            available in this portal.
                          </small>
                        </span>
                      </label>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="export-column-panel">
                      <div className="export-column-actions">
                        <span>
                          {selectedCount} of {columns.length} columns selected
                        </span>
                        <button
                          className="button secondary compact-button"
                          onClick={() =>
                            setSelectedColumns(
                              new Set(columns.map((column) => column.name)),
                            )
                          }
                          type="button"
                        >
                          Select all
                        </button>
                      </div>
                      <div className="export-column-list">
                        {columns.map((column) => (
                          <label className="export-column" key={column.name}>
                            <input
                              checked={selectedColumns.has(column.name)}
                              onChange={() => toggleColumn(column.name)}
                              type="checkbox"
                            />
                            <span>{column.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="export-choice-grid">
                      <label className="export-choice">
                        <input
                          checked={format === "csv"}
                          name="export-format"
                          onChange={() => setFormat("csv")}
                          type="radio"
                        />
                        <TableProperties size={18} />
                        <span>
                          <strong>CSV</strong>
                          <small>Best for imports, automation, and plain text.</small>
                        </span>
                      </label>
                      <label className="export-choice">
                        <input
                          checked={format === "xlsx"}
                          name="export-format"
                          onChange={() => setFormat("xlsx")}
                          type="radio"
                        />
                        <FileSpreadsheet size={18} />
                        <span>
                          <strong>Excel workbook</strong>
                          <small>Best for opening directly in spreadsheet apps.</small>
                        </span>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="note-modal-actions export-modal-actions">
                  {step > 0 ? (
                    <button
                      className="button secondary"
                      onClick={() => setStep((current) => current - 1)}
                      type="button"
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                  ) : (
                    <button className="button secondary" onClick={close} type="button">
                      Cancel
                    </button>
                  )}
                  {step < steps.length - 1 ? (
                    <button
                      className="button"
                      disabled={step === 1 && selectedCount === 0}
                      onClick={() => setStep((current) => current + 1)}
                      type="button"
                    >
                      Next
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <a
                      className={`button ${selectedCount ? "" : "is-disabled"}`}
                      href={selectedCount ? exportHref() : undefined}
                      onClick={() => {
                        if (selectedCount) close();
                      }}
                    >
                      <Download size={15} />
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
