"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CheckSquare, Heart, LoaderCircle, Pencil, X } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { PortalFieldConfig, TwentyFieldMetadata } from "@/lib/db/schema";
import { formatPortalValue } from "@/lib/format-value";
import { RecordSidePanel } from "@/components/record-side-panel";
import { PortalRecordValue } from "@/components/portal-record-value";
import { extractPortalFiles } from "@/lib/file-values";
import type { PortalRecordPage } from "@/app/actions/portal";
import { AppSelect } from "@/components/ui/app-select";
import { isWritablePortalField } from "@/lib/twenty/validation";
import { recordInputType } from "@/components/record-form";

type RecordRow = Record<string, unknown> & { id: string };

function PortalTableValue({
  value,
  type,
  selectOptions,
  formatSelectValues,
}: {
  value: unknown;
  type?: string;
  selectOptions?: Array<{ value: string; label: string; color?: string }>;
  formatSelectValues: boolean;
}) {
  const files = extractPortalFiles(value);
  if (files.length) {
    return (
      <PortalRecordValue
        formatSelectValues={formatSelectValues}
        selectOptions={selectOptions}
        type={type}
        value={value}
      />
    );
  }
  const formatted = formatPortalValue(value, type, {
    selectOptions,
    formatSelectValues,
  });

  if (type === "SELECT" || type === "MULTI_SELECT") {
    const values = formatted
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && item !== "—");

    if (!values.length) return <span className="table-empty-value">—</span>;
    return (
      <span className="table-tag-list" title={formatted}>
        {values.map((item) => {
          const option = selectOptions?.find(
            (candidate) =>
              candidate.label.toLowerCase() === item.toLowerCase() ||
              candidate.value.toLowerCase() === item.toLowerCase(),
          );
          const semanticColor = /complete|paid|success/i.test(item)
            ? "#16805b"
            : /at risk|overdue|failed|blocked/i.test(item)
              ? "#c03d3d"
              : /planning|sent|progress/i.test(item)
                ? "#2563eb"
                : undefined;
          const namedColors: Record<string, string> = {
            blue: "#2563eb",
            green: "#16805b",
            gray: "#737373",
            orange: "#b56708",
            purple: "#7c3aed",
            red: "#c03d3d",
            yellow: "#a16207",
          };
          const configuredColor = option?.color
            ? namedColors[option.color.toLowerCase()] ??
              (/^#[0-9a-f]{6}$/i.test(option.color)
                ? option.color
                : undefined)
            : undefined;
          const color = configuredColor ?? semanticColor;
          return (
            <span
              className={`table-tag ${color ? "has-color" : ""}`}
              key={item}
              style={
                color
                  ? ({ "--tag-color": color } as CSSProperties)
                  : undefined
              }
            >
              {item}
            </span>
          );
        })}
      </span>
    );
  }

  if (type === "BOOLEAN") {
    return (
      <span className={`table-boolean ${formatted === "Yes" ? "is-true" : ""}`}>
        <span aria-hidden="true" />
        {formatted}
      </span>
    );
  }

  return (
    <span
      className={formatted === "—" ? "table-empty-value" : "table-cell-value"}
      title={formatted === "—" ? undefined : formatted}
    >
      {formatted}
    </span>
  );
}

export function PortalDataTable({
  records,
  columns,
  metadataFields,
  recordBaseHref,
  recordSelectionHref,
  recordCloseHref,
  selectedRecordId,
  recordTitleField,
  hasNextPage = false,
  endCursor = null,
  loadMoreAction,
  listKey = "",
  formatSelectValues = true,
  recordPanel = null,
  recordPanelTitle = "Record details",
  editableFields = [],
  bulkEditAction,
}: {
  records: RecordRow[];
  columns: Array<{ name: string; label?: string }>;
  metadataFields: TwentyFieldMetadata[];
  recordBaseHref?: string | null;
  recordSelectionHref?: string | null;
  recordCloseHref?: string | null;
  selectedRecordId?: string | null;
  recordTitleField?: string | null;
  hasNextPage?: boolean;
  endCursor?: string | null;
  loadMoreAction?: (cursor: string) => Promise<PortalRecordPage>;
  listKey?: string;
  formatSelectValues?: boolean;
  recordPanel?: ReactNode;
  recordPanelTitle?: string;
  editableFields?: PortalFieldConfig[];
  bulkEditAction?: (recordIds: string[], formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [loadedRecords, setLoadedRecords] = useState(records);
  const [nextCursor, setNextCursor] = useState(endCursor);
  const [moreAvailable, setMoreAvailable] = useState(hasNextPage);
  const [loadError, setLoadError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false);
  const [bulkField, setBulkField] = useState(editableFields[0]?.name ?? "");
  const [, startTransition] = useTransition();
  const visibleRecords = useMemo(
    () => favoritesOnly
      ? loadedRecords.filter((record) => favoriteIds.has(record.id))
      : loadedRecords,
    [favoriteIds, favoritesOnly, loadedRecords],
  );
  const helper = createColumnHelper<RecordRow>();
  const metadataByName = new Map(
    metadataFields.map((field) => [field.name, field]),
  );
  const pendingRecord = pendingRecordId
    ? loadedRecords.find((record) => record.id === pendingRecordId)
    : undefined;
  const pendingTitle = pendingRecord
    ? recordTitleField
      ? formatPortalValue(
          pendingRecord[recordTitleField],
          metadataByName.get(recordTitleField)?.type,
        )
      : columns
          .map((column) =>
            formatPortalValue(
              pendingRecord[column.name],
              metadataByName.get(column.name)?.type,
            ),
          )
          .find((value) => value && value !== "—")
    : undefined;
  const recordHref = (recordId: string) =>
    recordSelectionHref
      ? `${recordSelectionHref}${encodeURIComponent(recordId)}`
      : `${recordBaseHref}/${recordId}`;
  const prefetchRecord = (recordId: string) => {
    if (recordSelectionHref || recordBaseHref) {
      router.prefetch(recordHref(recordId));
    }
  };
  useEffect(() => {
    setLoadedRecords(records);
    setNextCursor(endCursor);
    setMoreAvailable(hasNextPage);
    setLoadError("");
    loadingRef.current = false;
  }, [endCursor, hasNextPage, listKey, records]);

  useEffect(() => {
    const key = `portal-favorites:${listKey}`;
    try {
      setFavoriteIds(new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as string[]));
    } catch {
      localStorage.removeItem(key);
    }
  }, [listKey]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (pendingRecordId && selectedRecordId === pendingRecordId) {
      setPendingRecordId(null);
    }
  }, [pendingRecordId, selectedRecordId]);

  const loadMore = useCallback(async () => {
    if (
      loadingRef.current ||
      !loadMoreAction ||
      !moreAvailable ||
      !nextCursor
    ) {
      return;
    }
    loadingRef.current = true;
    setLoadingMore(true);
    setLoadError("");
    try {
      const nextPage = await loadMoreAction(nextCursor);
      setLoadedRecords((current) => {
        const existing = new Set(current.map((record) => record.id));
        return [
          ...current,
          ...nextPage.records.filter((record) => !existing.has(record.id)),
        ];
      });
      setNextCursor(nextPage.endCursor);
      setMoreAvailable(nextPage.hasNextPage);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "More records could not be loaded.",
      );
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [loadMoreAction, moreAvailable, nextCursor]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !moreAvailable) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, moreAvailable]);

  useEffect(() => {
    const target = tableScrollRef.current;
    if (!target) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.deltaY || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      const scrollRoot = target.closest<HTMLElement>(".app-main");
      if (!scrollRoot) return;
      const before = scrollRoot.scrollTop;
      scrollRoot.scrollTop += event.deltaY;
      if (scrollRoot.scrollTop !== before) {
        event.preventDefault();
      }
    };

    target.addEventListener("wheel", handleWheel, { passive: false });
    return () => target.removeEventListener("wheel", handleWheel);
  }, []);

  // TanStack Table owns memoization internally; React Compiler should not wrap it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: visibleRecords,
    columns: [
      helper.display({
        id: "selection",
        header: () => (
          <input
            aria-label="Select all records"
            checked={Boolean(visibleRecords.length) && visibleRecords.every((record) => selectedIds.has(record.id))}
            onChange={(event) => setSelectedIds(event.target.checked ? new Set(visibleRecords.map((record) => record.id)) : new Set())}
            type="checkbox"
          />
        ),
        cell: ({ row }) => (
          <span className="table-selection-cell">
            <input
              aria-label={`Select record ${row.original.id}`}
              checked={selectedIds.has(row.original.id)}
              onChange={(event) => setSelectedIds((current) => {
                const next = new Set(current);
                if (event.target.checked) next.add(row.original.id); else next.delete(row.original.id);
                return next;
              })}
              type="checkbox"
            />
          </span>
        ),
      }),
      ...columns.map((column) =>
        helper.accessor((row) => row[column.name], {
          id: column.name,
          header: column.label ?? column.name,
          cell: (info) => (
            <PortalTableValue
              formatSelectValues={formatSelectValues}
              selectOptions={metadataByName.get(column.name)?.options}
              type={metadataByName.get(column.name)?.type}
              value={info.getValue()}
            />
          ),
        }),
      ),
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  const openRecord = (recordId: string) => {
    if (!recordSelectionHref) return;
    setPendingRecordId(recordId);
    if (selectedRecordId) commitRecordNavigation(recordId);
  };

  const commitRecordNavigation = (recordId: string) => {
    startTransition(() => {
      router.push(`${recordSelectionHref}${encodeURIComponent(recordId)}`, {
        scroll: false,
      });
    });
  };

  const pendingPanelVisible = Boolean(
    pendingRecordId && selectedRecordId !== pendingRecordId,
  );
  return (
    <div className="table-scroll" ref={tableScrollRef}>
      <div className="table-view-toolbar">
        <button
          aria-pressed={favoritesOnly}
          className={favoritesOnly ? "is-active" : ""}
          disabled={!favoriteIds.size && !favoritesOnly}
          onClick={() => setFavoritesOnly((current) => !current)}
          type="button"
        >
          <Heart fill={favoritesOnly ? "currentColor" : "none"} size={14} />
          Favorites
          <span>{favoriteIds.size}</span>
        </button>
        {favoritesOnly ? <small>Showing favorited records only</small> : null}
      </div>
      {selectedIds.size ? (
        <div className="table-selection-toolbar">
          <span><CheckSquare size={15} /> {selectedIds.size} selected</span>
          {bulkEditAction && editableFields.length ? <button className="button compact-button" onClick={() => setBulkEditorOpen(true)} type="button"><Pencil size={14} /> Bulk edit</button> : null}
          <button aria-label="Clear selection" className="icon-button" onClick={() => setSelectedIds(new Set())} type="button"><X size={15} /></button>
        </div>
      ) : null}
      <table className="data-table portal-records-table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              aria-label={
                recordSelectionHref ? `Open record ${row.original.id}` : undefined
              }
              aria-selected={
                recordSelectionHref
                  ? selectedRecordId === row.original.id
                  : undefined
              }
              className={[
                recordSelectionHref ? "data-table-clickable-row" : "",
                selectedRecordId === row.original.id ? "is-selected" : "",
                favoriteIds.has(row.original.id) ? "is-favorite" : "",
                pendingRecordId === row.original.id
                  ? "is-loading"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={row.id}
              data-record-trigger
              onClick={(event) => {
                if (
                  recordSelectionHref &&
                  !(event.target as HTMLElement).closest(
                    "a, button, input, select, textarea",
                  )
                ) {
                  openRecord(row.original.id);
                }
              }}
              onFocus={() => prefetchRecord(row.original.id)}
              onKeyDown={(event) => {
                if (
                  recordSelectionHref &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  openRecord(row.original.id);
                }
              }}
              onMouseEnter={() => prefetchRecord(row.original.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({ id: row.original.id, x: Math.min(event.clientX, window.innerWidth - 222), y: Math.min(event.clientY, window.innerHeight - 142) });
              }}
              tabIndex={recordSelectionHref ? 0 : undefined}
            >
              {row.getVisibleCells().map((cell) => {
                return (
                  <td className="max-w-sm truncate" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {contextMenu ? (
        <div className="record-context-menu" onPointerDown={(event) => event.stopPropagation()} role="menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => { setSelectedIds((current) => new Set(current).add(contextMenu.id)); setContextMenu(null); }} role="menuitem" type="button"><CheckSquare size={15} /> Select record</button>
          {recordSelectionHref ? <button onClick={() => { openRecord(contextMenu.id); setContextMenu(null); }} role="menuitem" type="button"><Pencil size={15} /> {editableFields.length ? "Edit record" : "View record"}</button> : null}
          <button onClick={() => {
            setFavoriteIds((current) => {
              const next = new Set(current);
              if (next.has(contextMenu.id)) next.delete(contextMenu.id); else next.add(contextMenu.id);
              localStorage.setItem(`portal-favorites:${listKey}`, JSON.stringify([...next]));
              return next;
            });
            setContextMenu(null);
          }} role="menuitem" type="button"><Heart fill={favoriteIds.has(contextMenu.id) ? "currentColor" : "none"} size={15} /> {favoriteIds.has(contextMenu.id) ? "Remove favorite" : "Favorite record"}</button>
        </div>
      ) : null}
      {!visibleRecords.length ? (
        <p className="p-8 text-center text-sm text-[#68758a]">
          {favoritesOnly ? "No favorited records match the current filters." : "No records match the current filters."}
        </p>
      ) : null}
      {loadError ? (
        <div className="infinite-scroll-status is-error">
          <span>{loadError}</span>
          <button
            className="button secondary compact-button"
            onClick={loadMore}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}
      <div
        aria-live="polite"
        className="infinite-scroll-status"
        ref={loadMoreRef}
      >
        {loadingMore ? (
          <>
            <LoaderCircle className="spin-icon" size={15} />
            Loading more records…
          </>
        ) : moreAvailable ? (
          <button
            className="infinite-scroll-fallback"
            onClick={loadMore}
            type="button"
          >
            Load more records
          </button>
        ) : visibleRecords.length ? (
          <span>All records loaded</span>
        ) : null}
      </div>
      {recordCloseHref &&
      (pendingPanelVisible ||
        (selectedRecordId && recordPanel)) ? (
        <RecordSidePanel
          closeHref={recordCloseHref}
          loading={pendingPanelVisible}
          onOpened={() => {
            if (pendingRecordId && pendingPanelVisible) {
              commitRecordNavigation(pendingRecordId);
            }
          }}
          title={recordPanelTitle}
        >
          {pendingPanelVisible && pendingRecordId ? (
            <>
              <header className="record-panel-header">
                <div className="record-panel-heading">
                  <p className="eyebrow">Record</p>
                  <h2>{pendingTitle || "Loading record"}</h2>
                </div>
              </header>
              <div className="record-panel-body">
                <div
                  aria-label="Loading record details"
                  className="record-panel-loading"
                  role="status"
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <div className="record-panel-loading-row" key={index}>
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            recordPanel
          )}
        </RecordSidePanel>
      ) : null}
      {bulkEditorOpen && bulkEditAction ? (
        <RecordSidePanel onClose={() => setBulkEditorOpen(false)} title="Bulk edit records">
          <header className="record-panel-header bulk-edit-header"><div className="record-panel-heading"><p className="eyebrow">Bulk edit</p><h2>Update selected records</h2><p>One change will be applied to {selectedIds.size} {selectedIds.size === 1 ? "record" : "records"}.</p></div></header>
          <div className="record-panel-body bulk-edit-panel-body">
            <div className="bulk-edit-summary"><span><CheckSquare size={18} /></span><div><strong>{selectedIds.size} {selectedIds.size === 1 ? "record" : "records"} selected</strong><p>Only fields enabled for client editing are available.</p></div></div>
            <form action={bulkEditAction.bind(null, [...selectedIds])} className="bulk-edit-form">
              <div className="bulk-edit-field-group">
                <span className="bulk-edit-step">01</span>
                <div className="field"><label htmlFor="bulk-field">Field to update</label>
                  <AppSelect className="input" id="bulk-field" name="bulkField" onChange={(event) => setBulkField(event.target.value)} value={bulkField}>
                    {editableFields.filter((config) => { const field = metadataByName.get(config.name); return field && isWritablePortalField(field); }).map((config) => <option key={config.name} value={config.name}>{config.label ?? metadataByName.get(config.name)?.label ?? config.name}</option>)}
                  </AppSelect>
                </div>
              </div>
              <div className="bulk-edit-field-group">
                <span className="bulk-edit-step">02</span>
                <div className="field"><label htmlFor="bulk-value">New value</label>
                  {(() => {
                    const field = metadataByName.get(bulkField);
                    if (field?.type === "SELECT" || field?.type === "MULTI_SELECT") return <AppSelect className="input" id="bulk-value" name="bulkValue"><option value="">Choose a value</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</AppSelect>;
                    if (field?.type === "BOOLEAN") return <AppSelect className="input" id="bulk-value" name="bulkValue"><option value="true">Yes</option><option value="false">No</option></AppSelect>;
                    return <input className="input" id="bulk-value" name="bulkValue" placeholder="Enter the value to apply" step={field && ["NUMBER", "NUMERIC", "CURRENCY"].includes(field.type) ? "any" : undefined} type={recordInputType(field?.type ?? "TEXT")} />;
                  })()}
                </div>
              </div>
              <div className="bulk-edit-notice"><strong>Review before applying</strong><p>This replaces the selected field on every selected record. Other values remain unchanged.</p></div>
              <footer className="bulk-edit-actions"><button className="button" type="submit">Apply to {selectedIds.size} {selectedIds.size === 1 ? "record" : "records"}</button></footer>
            </form>
          </div>
        </RecordSidePanel>
      ) : null}
    </div>
  );
}
