"use client";

import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

type RecordRow = Record<string, unknown> & { id: string };

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if ("amountMicros" in object) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: String(object.currencyCode ?? "USD"),
      }).format(Number(object.amountMicros) / 1_000_000);
    }
    if ("firstName" in object || "lastName" in object) {
      return [object.firstName, object.lastName].filter(Boolean).join(" ");
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export function PortalDataTable({
  records,
  columns,
  viewSlug,
}: {
  records: RecordRow[];
  columns: Array<{ name: string; label?: string }>;
  viewSlug: string;
}) {
  const helper = createColumnHelper<RecordRow>();
  // TanStack Table owns memoization internally; React Compiler should not wrap it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: records,
    columns: [
      ...columns.map((column) =>
        helper.accessor((row) => row[column.name], {
          id: column.name,
          header: column.label ?? column.name,
          cell: (info) => formatValue(info.getValue()),
        }),
      ),
      helper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            className="font-semibold text-[#3157d5]"
            href={`/portal/${viewSlug}/${row.original.id}`}
          >
            View
          </Link>
        ),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#f8f9fc] text-[#68758a]">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th className="whitespace-nowrap p-4" key={header.id}>
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
            <tr className="border-t border-[#edf0f5]" key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td className="max-w-sm truncate p-4" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
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
