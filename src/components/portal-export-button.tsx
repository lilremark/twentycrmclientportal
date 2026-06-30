"use client";

import { useCallback, useState } from "react";
import {
  Check,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  TableProperties,
} from "lucide-react";
import { RecordSidePanel } from "@/components/record-side-panel";

type ExportColumn = { name: string; label: string };
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
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [selectedColumns, setSelectedColumns] = useState(
    () => new Set(columns.map((column) => column.name)),
  );
  const close = useCallback(() => setOpen(false), []);

  const toggleColumn = (name: string) => {
    setSelectedColumns((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const exportHref = () => {
    const params = new URLSearchParams();
    const current = new URLSearchParams(currentQueryString);
    if (scope === "filtered") {
      for (const [key, value] of current) {
        if (
          key === "saved" || key === "sort" || key === "direction" ||
          key.startsWith("f_") || key.startsWith("op_")
        ) params.append(key, value);
      }
    } else {
      const sort = current.get("sort");
      const direction = current.get("direction");
      if (sort) params.set("sort", sort);
      if (direction) params.set("direction", direction);
    }
    params.set("scope", scope);
    params.set("format", format);
    for (const column of columns) {
      if (selectedColumns.has(column.name)) params.append("column", column.name);
    }
    return `/api/portal/${encodeURIComponent(viewSlug)}/export?${params.toString()}`;
  };

  const selectedCount = selectedColumns.size;
  const formatLabel = format === "xlsx" ? "XLSX" : "CSV";

  return (
    <>
      <button className="button secondary" disabled={!columns.length} onClick={() => setOpen(true)} type="button">
        <Download size={15} /> Export
      </button>
      {open ? (
        <RecordSidePanel onClose={close} title={`Export ${objectLabel}`}>
          <div className="export-workspace">
            <header className="export-workspace-header">
              <div>
                <p className="eyebrow">Export workspace</p>
                <h2 id="export-panel-title">Export {objectLabel}</h2>
                <span>Configure the file in one pass. Only fields shared in this portal are available.</span>
              </div>
            </header>

            <div className="export-workspace-body">
              <section className="export-config-section">
                <div className="export-config-heading"><span>01</span><div><h3>Records</h3><p>Choose which shared records to include.</p></div></div>
                <div className="export-choice-grid export-choice-grid-compact">
                  <label className="export-choice">
                    <input checked={scope === "filtered"} name="export-scope" onChange={() => setScope("filtered")} type="radio" />
                    <Filter size={17} />
                    <span><strong>Current view</strong><small>Keep active filters, saved view, and sorting.</small></span>
                  </label>
                  <label className="export-choice">
                    <input checked={scope === "all"} name="export-scope" onChange={() => setScope("all")} type="radio" />
                    <Database size={17} />
                    <span><strong>All shared records</strong><small>Ignore filters while preserving the current sort.</small></span>
                  </label>
                </div>
              </section>

              <section className="export-config-section">
                <div className="export-config-heading"><span>02</span><div><h3>Columns</h3><p>{selectedCount} of {columns.length} fields selected.</p></div><button onClick={() => setSelectedColumns(selectedCount === columns.length ? new Set() : new Set(columns.map((column) => column.name)))} type="button">{selectedCount === columns.length ? "Clear" : "Select all"}</button></div>
                <div className="export-column-list">
                  {columns.map((column) => (
                    <label className="export-column" key={column.name}>
                      <input checked={selectedColumns.has(column.name)} onChange={() => toggleColumn(column.name)} type="checkbox" />
                      <span>{column.label}</span>
                      {selectedColumns.has(column.name) ? <Check size={14} /> : null}
                    </label>
                  ))}
                </div>
              </section>

              <section className="export-config-section">
                <div className="export-config-heading"><span>03</span><div><h3>File type</h3><p>Choose the format for the next step in your workflow.</p></div></div>
                <div className="export-format-grid">
                  <label className="export-format-choice">
                    <input checked={format === "csv"} name="export-format" onChange={() => setFormat("csv")} type="radio" />
                    <TableProperties size={19} /><span><strong>CSV</strong><small>Imports and automation</small></span>
                  </label>
                  <label className="export-format-choice">
                    <input checked={format === "xlsx"} name="export-format" onChange={() => setFormat("xlsx")} type="radio" />
                    <FileSpreadsheet size={19} /><span><strong>XLSX</strong><small>Spreadsheet review</small></span>
                  </label>
                </div>
              </section>
            </div>

            <footer className="export-workspace-footer">
              <div><strong>{formatLabel}</strong><span>{scope === "filtered" ? "Current view" : "All shared records"} · {selectedCount} column{selectedCount === 1 ? "" : "s"}</span></div>
              <a aria-disabled={!selectedCount} className={`button ${selectedCount ? "" : "is-disabled"}`} href={selectedCount ? exportHref() : undefined} onClick={() => selectedCount && close()}>
                <Download size={15} /> Download {formatLabel}
              </a>
            </footer>
          </div>
        </RecordSidePanel>
      ) : null}
    </>
  );
}
