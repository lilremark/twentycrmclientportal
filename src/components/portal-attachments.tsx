import { FolderOpen, Paperclip, Upload } from "lucide-react";

import { PortalRecordValue } from "@/components/portal-record-value";
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
        <div className="record-section-title">
          <span className="record-section-icon">
            <FolderOpen size={16} />
          </span>
          <div>
            <h3>Files and attachments</h3>
            <p>Preview, download, or add files shared with this record</p>
          </div>
        </div>
      </div>
      {files.length ? (
        <PortalRecordValue
          deleteAttachmentAction={
            canUpload ? deleteAttachmentAction : undefined
          }
          pdfPreview
          type="RELATION"
          value={value}
        />
      ) : (
        <div className="record-files-empty">
          <Paperclip size={17} />
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
