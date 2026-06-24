import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import { formatPortalValue } from "@/lib/format-value";

export type PortalExportColumn = {
  name: string;
  label: string;
  type?: string;
  selectOptions?: Array<{ value: string; label: string }>;
};

const encoder = new TextEncoder();
const emptyDate = new Uint8Array([0, 0, 0, 0]);

function sanitizeExportName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "portal-export"
  );
}

export function portalExportFilename(input: {
  label: string;
  format: "csv" | "xlsx";
}) {
  const date = new Date().toISOString().slice(0, 10);
  return `${sanitizeExportName(input.label)}-${date}.${input.format}`;
}

export function exportColumns(input: {
  columns: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
  selectedNames?: string[];
}) {
  const metadataByName = new Map(
    input.metadataFields.map((field) => [field.name, field]),
  );
  const allowedSelected = new Set(
    (input.selectedNames ?? [])
      .map((name) => name.trim())
      .filter((name) => input.columns.some((column) => column.name === name)),
  );
  const sourceColumns = allowedSelected.size
    ? input.columns.filter((column) => allowedSelected.has(column.name))
    : input.columns;

  return sourceColumns.map((column): PortalExportColumn => {
    const field = metadataByName.get(column.name);
    return {
      name: column.name,
      label: column.label ?? field?.label ?? column.name,
      type: field?.type,
      selectOptions: field?.options,
    };
  });
}

function exportCellValue(
  record: Record<string, unknown>,
  column: PortalExportColumn,
  formatSelectValues: boolean,
) {
  const value = formatPortalValue(record[column.name], column.type, {
    selectOptions: column.selectOptions,
    formatSelectValues,
  });
  return value === "—" ? "" : value;
}

function csvCell(value: string) {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safeValue)
    ? `"${safeValue.replace(/"/g, '""')}"`
    : safeValue;
}

export function recordsToCsv(input: {
  columns: PortalExportColumn[];
  records: Array<Record<string, unknown>>;
  formatSelectValues: boolean;
}) {
  const lines = [
    input.columns.map((column) => csvCell(column.label)).join(","),
    ...input.records.map((record) =>
      input.columns
        .map((column) =>
          csvCell(exportCellValue(record, column, input.formatSelectValues)),
        )
        .join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function sheetCell(rowIndex: number, columnIndex: number, value: string) {
  const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function worksheetXml(input: {
  columns: PortalExportColumn[];
  records: Array<Record<string, unknown>>;
  formatSelectValues: boolean;
}) {
  const rows = [
    input.columns.map((column) => column.label),
    ...input.records.map((record) =>
      input.columns.map((column) =>
        exportCellValue(record, column, input.formatSelectValues),
      ),
    ),
  ];
  const sheetData = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => sheetCell(rowIndex, columnIndex, value))
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const dimension =
    input.columns.length && rows.length
      ? `A1:${columnName(input.columns.length - 1)}${rows.length}`
      : "A1";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetData>${sheetData}</sheetData>
</worksheet>`;
}

function crcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    return crc >>> 0;
  });
}

const crcLookup = crcTable();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcLookup[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function zipFile(input: {
  name: string;
  content: string;
  offset: number;
}) {
  const nameBytes = encoder.encode(input.name);
  const contentBytes = encoder.encode(input.content);
  const crc = crc32(contentBytes);
  const local = concatBytes([
    uint32(0x04034b50),
    uint16(20),
    uint16(0),
    uint16(0),
    emptyDate,
    uint32(crc),
    uint32(contentBytes.byteLength),
    uint32(contentBytes.byteLength),
    uint16(nameBytes.byteLength),
    uint16(0),
    nameBytes,
    contentBytes,
  ]);
  const central = concatBytes([
    uint32(0x02014b50),
    uint16(20),
    uint16(20),
    uint16(0),
    uint16(0),
    emptyDate,
    uint32(crc),
    uint32(contentBytes.byteLength),
    uint32(contentBytes.byteLength),
    uint16(nameBytes.byteLength),
    uint16(0),
    uint16(0),
    uint16(0),
    uint16(0),
    uint32(0),
    uint32(input.offset),
    nameBytes,
  ]);
  return { local, central };
}

function zip(files: Array<{ name: string; content: string }>) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const entry = zipFile({ ...file, offset });
    locals.push(entry.local);
    centrals.push(entry.central);
    offset += entry.local.byteLength;
  }
  const centralDirectory = concatBytes(centrals);
  return concatBytes([
    ...locals,
    centralDirectory,
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.byteLength),
    uint32(offset),
    uint16(0),
  ]);
}

export function recordsToXlsx(input: {
  columns: PortalExportColumn[];
  records: Array<Record<string, unknown>>;
  formatSelectValues: boolean;
}) {
  return zip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Portal export" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: worksheetXml(input),
    },
  ]);
}
