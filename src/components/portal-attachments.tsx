import { Download, Eye, FileText, FolderOpen, Paperclip, Upload } from "lucide-react";

import { DeleteUploadButton } from "@/components/delete-upload-button";
import { extractPortalFiles } from "@/lib/file-values";

export function PortalAttachments({
  value,
  canUpload,
  uploadAction,
  deleteAttachmentAction,
}: {
  value: unknown;
  canUpload: boolean;
  uploadAction: (formData: FormData) => void | Promise<void>;
  deleteAttachmentAction: (
    attachmentId: string,
  ) => void | Promise<void>;
}) {
  const files = extractPortalFiles(value);

  return (
    <section className="record-attachments-section">
      <div className="record-attachments-heading">
        <h3>
          All <span>{files.length}</span>
        </h3>
      </div>
      {files.length ? (
        <div className="record-file-list record-file-tab-list">
          {files.map((file) => (
            <article className="record-file-item" key={`${file.href}:${file.label}`}>
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
                  {canUpload && file.attachmentId ? (
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
              {file.isPdf ? (
                <details className="record-pdf-preview">
                  <summary>Preview PDF</summary>
                  <iframe loading="lazy" src={file.href} title={file.label} />
                </details>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="record-files-empty">
          <FolderOpen size={18} />
          <div>
            <strong>No files attached</strong>
            <p>Files added to this record will appear here.</p>
          </div>
        </div>
      )}
      {canUpload ? (
        <form
          action={uploadAction}
          className="record-attachment-upload"
          encType="multipart/form-data"
        >
          <span className="record-attachment-upload-icon">
            <Paperclip size={16} />
          </span>
          <label>
            <span>Upload a file to this record</span>
            <input name="attachment" required type="file" />
          </label>
          <button className="button" type="submit">
            <Upload size={14} />
            Upload file
          </button>
        </form>
      ) : null}
    </section>
  );
}
