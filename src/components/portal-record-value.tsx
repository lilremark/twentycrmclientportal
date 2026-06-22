import { Download, Eye, FileText } from "lucide-react";

import { DeleteUploadButton } from "@/components/delete-upload-button";
import { extractPortalFiles } from "@/lib/file-values";
import { formatPortalValue } from "@/lib/format-value";

export function PortalRecordValue({
  value,
  type,
  pdfPreview = false,
  deleteAttachmentAction,
  selectOptions,
  formatSelectValues = true,
}: {
  value: unknown;
  type?: string;
  pdfPreview?: boolean;
  deleteAttachmentAction?: (attachmentId: string) => void | Promise<void>;
  selectOptions?: Array<{ value: string; label: string }>;
  formatSelectValues?: boolean;
}) {
  const files = extractPortalFiles(value);
  if (files.length) {
    return (
      <div className="record-file-list">
        {files.map((file) => (
          <div className="record-file-item" key={`${file.href}:${file.label}`}>
            <div className="record-file-heading">
              <span>
                <FileText size={15} />
                {file.label}
              </span>
              <div>
                <a href={file.href} rel="noreferrer" target="_blank">
                  <Eye size={14} />
                  Open
                </a>
                <a href={file.downloadHref}>
                  <Download size={14} />
                  Download
                </a>
                {deleteAttachmentAction && file.attachmentId ? (
                  <DeleteUploadButton
                    action={deleteAttachmentAction.bind(
                      null,
                      file.attachmentId,
                    )}
                    confirmMessage={`Delete ${file.label}? This removes the attachment from Twenty.`}
                  />
                ) : null}
              </div>
            </div>
            {pdfPreview && file.isPdf ? (
              <details className="record-pdf-preview">
                <summary>Preview PDF</summary>
                <iframe
                  loading="lazy"
                  src={file.href}
                  title={file.label}
                />
              </details>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  const formatted = formatPortalValue(value, type, {
    selectOptions,
    formatSelectValues,
  });
  if (formatted === "—") return <span className="table-empty-value">—</span>;
  return <span>{formatted}</span>;
}
