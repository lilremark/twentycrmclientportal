import { describe, expect, it, vi } from "vitest";

import {
  exportColumns,
  portalExportFilename,
  recordsToCsv,
  recordsToXlsx,
} from "@/lib/portal-export";
import type { TwentyFieldMetadata } from "@/lib/db/schema";

const fields: TwentyFieldMetadata[] = [
  {
    id: "name",
    name: "name",
    label: "Name",
    type: "TEXT",
    isNullable: false,
  },
  {
    id: "status",
    name: "status",
    label: "Status",
    type: "SELECT",
    isNullable: true,
    options: [{ value: "IN_PROGRESS", label: "In progress" }],
  },
];

describe("portal export formatting", () => {
  it("formats selected columns as CSV with safe spreadsheet cells", () => {
    const columns = exportColumns({
      columns: [{ name: "name" }, { name: "status" }],
      metadataFields: fields,
      selectedNames: ["name", "status"],
    });

    const csv = recordsToCsv({
      columns,
      records: [
        { name: "=SUM(1,1)", status: "IN_PROGRESS" },
        { name: "Acme, Inc.", status: null },
      ],
      formatSelectValues: true,
    });

    expect(csv).toContain("Name,Status");
    expect(csv).toContain("\"'=SUM(1,1)\",In progress");
    expect(csv).toContain("\"Acme, Inc.\",");
  });

  it("creates a downloadable XLSX zip payload", () => {
    const columns = exportColumns({
      columns: [{ name: "name" }],
      metadataFields: fields,
    });

    const xlsx = recordsToXlsx({
      columns,
      records: [{ name: "Acme" }],
      formatSelectValues: true,
    });
    const text = new TextDecoder().decode(xlsx);

    expect(Array.from(xlsx.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(text).toContain("xl/worksheets/sheet1.xml");
    expect(text).toContain("Acme");
  });

  it("sanitizes export filenames", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T12:00:00Z"));

    expect(
      portalExportFilename({ label: "Orders / West", format: "csv" }),
    ).toBe("Orders-West-2026-06-24.csv");

    vi.useRealTimers();
  });
});
