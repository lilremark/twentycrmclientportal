import { Paperclip, Upload } from "lucide-react";

import { PortalRecordValue } from "@/components/portal-record-value";

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
  return (
    <section className="record-attachments-section">
      <div className="record-attachments-heading">
        <div>
          <p className="eyebrow">Files</p>
          <h3>Attachments</h3>
        </div>
      </div>
      <PortalRecordValue
        deleteAttachmentAction={canUpload ? deleteAttachmentAction : undefined}
        pdfPreview
        type="RELATION"
        value={value}
      />
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
