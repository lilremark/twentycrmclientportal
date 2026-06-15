"use client";

import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { TwentyFieldMetadata } from "@/lib/db/schema";
import { formatPortalValue } from "@/lib/format-value";

type RecordRow = Record<string, unknown> & { id: string };

export function PortalDataTable({
  records,
  columns,
  metadataFields,
  recordBaseHref,
}: {
  records: RecordRow[];
  columns: Array<{ name: string; label?: string }>;
  metadataFields: TwentyFieldMetadata[];
  recordBaseHref?: string | null;
}) {
  const helper = createColumnHelper<RecordRow>();
  const metadataByName = new Map(
    metadataFields.map((field) => [field.name, field]),
  );
  // TanStack Table owns memoization internally; React Compiler should not wrap it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: records,
    columns: [
      ...columns.map((column) =>
        helper.accessor((row) => row[column.name], {
          id: column.name,
          header: column.label ?? column.name,
          cell: (info) =>
            formatPortalValue(
              info.getValue(),
              metadataByName.get(column.name)?.type,
            ),
        }),
      ),
      ...(recordBaseHref
        ? [
            helper.display({
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <Link
                  className="font-semibold text-[var(--brand-primary)]"
                  href={`${recordBaseHref}/${row.original.id}`}
                >
                  View
                </Link>
              ),
            }),
          ]
        : []),
    ],
    getCoreRowModel: getCoreRowModel(),
  });

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
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const type = metadataByName.get(cell.column.id)?.type;
                return (
                  <td
                    className={
                      type === "RELATION"
                        ? "max-w-sm whitespace-normal"
                        : "max-w-sm truncate"
                    }
                    key={cell.id}
                  >
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
    </div>
  );
}
