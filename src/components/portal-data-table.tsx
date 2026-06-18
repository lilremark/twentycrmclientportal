"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
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

type RecordRow = Record<string, unknown> & { id: string };

function PortalTableValue({
  value,
  type,
}: {
  value: unknown;
  type?: string;
}) {
  const files = extractPortalFiles(value);
  if (files.length) {
    return <PortalRecordValue type={type} value={value} />;
  }
  const formatted = formatPortalValue(value, type);

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
}: {
  records: RecordRow[];
  columns: Array<{ name: string; label?: string }>;
  metadataFields: TwentyFieldMetadata[];
  recordBaseHref?: string | null;
  recordSelectionHref?: string | null;
  recordCloseHref?: string | null;
  selectedRecordId?: string | null;
  recordTitleField?: string | null;
}) {
  const router = useRouter();
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const helper = createColumnHelper<RecordRow>();
  const metadataByName = new Map(
    metadataFields.map((field) => [field.name, field]),
  );
  const pendingRecord = pendingRecordId
    ? records.find((record) => record.id === pendingRecordId)
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
  // TanStack Table owns memoization internally; React Compiler should not wrap it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: records,
    columns: [
      ...columns.map((column) =>
        helper.accessor((row) => row[column.name], {
          id: column.name,
          header: column.label ?? column.name,
          cell: (info) => (
            <PortalTableValue
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
      {!records.length ? (
        <p className="p-8 text-center text-sm text-[#68758a]">
          No records match the current filters.
        </p>
      ) : null}
      {isPending &&
      pendingRecordId &&
      recordCloseHref &&
      selectedRecordId !== pendingRecordId ? (
        <RecordSidePanel
          closeHref={recordCloseHref}
          loading
          title="Loading record details"
        >
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
        </RecordSidePanel>
      ) : null}
    </div>
  );
}
