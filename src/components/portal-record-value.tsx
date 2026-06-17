import { FileText } from "lucide-react";

import { extractPortalFiles } from "@/lib/file-values";
import { formatPortalValue } from "@/lib/format-value";

export function PortalRecordValue({
  value,
  type,
  pdfPreview = false,
}: {
  value: unknown;
  type?: string;
  pdfPreview?: boolean;
}) {
  const files = extractPortalFiles(value);
  if (files.length) {
    return (
      <div className="record-file-list">
        {files.map((file) => (
          <div className="record-file-item" key={`${file.href}:${file.label}`}>
            <a href={file.href} rel="noreferrer" target="_blank">
              <FileText size={15} />
              {file.label}
            </a>
            {pdfPreview && file.isPdf ? (
              <iframe
                loading="lazy"
                src={file.href}
                title={file.label}
              />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  const formatted = formatPortalValue(value, type);
  if (formatted === "—") return <span className="table-empty-value">—</span>;
  return <span>{formatted}</span>;
}
