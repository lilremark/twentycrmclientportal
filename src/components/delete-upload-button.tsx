"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { ConfirmationModal } from "@/components/confirmation-modal";

export function DeleteUploadButton({
  action,
  confirmMessage,
  label = "Delete",
  onDeleted,
}: {
  action: () => void | Promise<void>;
  confirmMessage: string;
  label?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        className="button danger compact-button"
        disabled={pending}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Trash2 size={13} />
        {pending ? "Deleting..." : label}
      </button>
      {open ? (
        <ConfirmationModal
          description={confirmMessage}
          onClose={close}
          title="Delete this item?"
        >
          <div className="form-actions">
            <button className="button secondary" onClick={close} type="button">
              Cancel
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await action();
                  close();
                  onDeleted?.();
                  router.refresh();
                })
              }
              type="button"
            >
              <Trash2 size={14} />
              {pending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </ConfirmationModal>
      ) : null}
    </>
  );
}
