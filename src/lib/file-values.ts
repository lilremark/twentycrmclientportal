export type PortalFileValue = {
  label: string;
  href: string;
  isPdf: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function filePathFromRecord(record: Record<string, unknown>) {
  return (
    stringValue(record.fullPath) ??
    stringValue(record.fullpath) ??
    stringValue(record.path) ??
    stringValue(record.url) ??
    stringValue(record.fileUrl) ??
    stringValue(record.downloadUrl)
  );
}

function fileLabelFromRecord(record: Record<string, unknown>, path: string) {
  return (
    stringValue(record.name) ??
    stringValue(record.fileName) ??
    stringValue(record.filename) ??
    stringValue(record.title) ??
    path.split("/").filter(Boolean).at(-1) ??
    "File"
  );
}

function isPdfFile(record: Record<string, unknown>, label: string, path: string) {
  const mime =
    stringValue(record.mimeType) ??
    stringValue(record.mime_type) ??
    stringValue(record.type);
  return (
    mime?.toLowerCase().includes("pdf") ||
    label.toLowerCase().endsWith(".pdf") ||
    path.toLowerCase().includes(".pdf")
  );
}

function proxyHref(path: string) {
  const params = new URLSearchParams();
  if (/^https?:\/\//i.test(path)) {
    params.set("url", path);
  } else {
    params.set("path", path);
  }
  return `/api/twenty/files?${params.toString()}`;
}

export function extractPortalFiles(value: unknown): PortalFileValue[] {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(extractPortalFiles);

  const record = asRecord(value);
  if (!record) return [];

  if (Array.isArray(record.edges)) {
    return record.edges.flatMap((edge) => {
      const edgeRecord = asRecord(edge);
      return extractPortalFiles(edgeRecord?.node ?? edge);
    });
  }

  const path = filePathFromRecord(record);
  const files: PortalFileValue[] = [];
  if (path) {
    const label = fileLabelFromRecord(record, path);
    files.push({
      label,
      href: proxyHref(path),
      isPdf: Boolean(isPdfFile(record, label, path)),
    });
  }

  for (const [key, nested] of Object.entries(record)) {
    if (
      key === "id" ||
      key === "name" ||
      key === "fileName" ||
      key === "filename" ||
      key === "title" ||
      key === "fullPath" ||
      key === "fullpath" ||
      key === "path" ||
      key === "url" ||
      key === "fileUrl" ||
      key === "downloadUrl"
    ) {
      continue;
    }
    if (nested && typeof nested === "object") {
      files.push(...extractPortalFiles(nested));
    }
  }

  return [
    ...new Map(files.map((file) => [`${file.href}:${file.label}`, file])).values(),
  ];
}
