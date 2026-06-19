"use client";

import { useCallback, useId, useState } from "react";

import { ConfirmationModal } from "@/components/confirmation-modal";

export function ConfirmDeleteForm({
  action,
  confirmText = "yes",
  description,
  disabled = false,
  title,
  triggerLabel = "Delete",
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmText?: string;
  description: string;
  disabled?: boolean;
  title: string;
  triggerLabel?: string;
}) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedConfirmText = confirmText.toLowerCase();
  const confirmed = value.trim().toLowerCase() === normalizedConfirmText;
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        className="button danger"
        disabled={disabled}
        onClick={() => {
          setValue("");
          setOpen(true);
        }}
        type="button"
      >
        {triggerLabel}
      </button>
      {open ? (
        <ConfirmationModal
          description={description}
          onClose={close}
          title={title}
        >
          <form action={action} className="confirmation-form">
          <label className="field" htmlFor={inputId}>
            <span>
              Type <strong>{confirmText}</strong> to confirm.
            </span>
            <input
              autoComplete="off"
              className="input"
              id={inputId}
              onChange={(event) => setValue(event.target.value)}
              value={value}
            />
          </label>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={close}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={!confirmed}
              formAction={action}
              type="submit"
            >
              Delete
            </button>
          </div>
          </form>
        </ConfirmationModal>
      ) : null}
    </>
  );
}
