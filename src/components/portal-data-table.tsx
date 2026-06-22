"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { TwentyFieldMetadata } from "@/lib/db/schema";
import { formatPortalValue } from "@/lib/format-value";
import { RecordSidePanel } from "@/components/record-side-panel";
import { PortalRecordValue } from "@/components/portal-record-value";
import { extractPortalFiles } from "@/lib/file-values";
import type { PortalRecordPage } from "@/app/actions/portal";

type RecordRow = Record<string, unknown> & { id: string };

function PortalTableValue({
  value,
  type,
  selectOptions,
  formatSelectValues,
}: {
  value: unknown;
  type?: string;
  selectOptions?: Array<{ value: string; label: string }>;
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
        {values.map((item) => (
          <span className="table-tag" key={item}>
            {item}
          </span>
        ))}
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
}) {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [loadedRecords, setLoadedRecords] = useState(records);
  const [nextCursor, setNextCursor] = useState(endCursor);
  const [moreAvailable, setMoreAvailable] = useState(hasNextPage);
  const [loadError, setLoadError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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

  // TanStack Table owns memoization internally; React Compiler should not wrap it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: loadedRecords,
    columns: [
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
      ...(recordBaseHref || recordSelectionHref
        ? [
            helper.display({
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <Link
                  className="table-row-action"
                  href={recordHref(row.original.id)}
                  onClick={(event) => {
                    if (recordSelectionHref) {
                      event.preventDefault();
                      openRecord(row.original.id);
                    }
                  }}
                  scroll={false}
                >
                  Open <ArrowRight size={12} />
                </Link>
              ),
            }),
          ]
        : []),
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  const openRecord = (recordId: string) => {
    if (!recordSelectionHref) return;
    setPendingRecordId(recordId);
    startTransition(() => {
      router.push(
        `${recordSelectionHref}${encodeURIComponent(recordId)}`,
        { scroll: false },
      );
    });
  };

  return (
    <div className="table-scroll">
      <table className="data-table">
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
                isPending && pendingRecordId === row.original.id
                  ? "is-loading"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={row.id}
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
      {!loadedRecords.length ? (
        <p className="p-8 text-center text-sm text-[#68758a]">
          No records match the current filters.
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
        ) : loadedRecords.length ? (
          <span>All records loaded</span>
        ) : null}
      </div>
      {recordCloseHref &&
      ((isPending &&
        pendingRecordId &&
        selectedRecordId !== pendingRecordId) ||
        (selectedRecordId && recordPanel)) ? (
        <RecordSidePanel
          closeHref={recordCloseHref}
          loading={
            Boolean(isPending && pendingRecordId) &&
            selectedRecordId !== pendingRecordId
          }
          title={recordPanelTitle}
        >
          {isPending &&
          pendingRecordId &&
          selectedRecordId !== pendingRecordId ? (
            <>
              <header className="record-panel-header">
                <div className="record-panel-heading">
                  <p className="eyebrow">Record</p>
                  <h2>{pendingTitle || "Loading record"}</h2>
                  <p title={pendingRecordId}>{pendingRecordId}</p>
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
    </div>
  );
}
