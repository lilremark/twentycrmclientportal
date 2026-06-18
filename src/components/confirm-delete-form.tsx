"use client";

import { useId, useRef, useState } from "react";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputId = useId();
  const [value, setValue] = useState("");
  const normalizedConfirmText = confirmText.toLowerCase();
  const confirmed = value.trim().toLowerCase() === normalizedConfirmText;

  return (
    <>
      <button
        className="button danger"
        disabled={disabled}
        onClick={() => {
          setValue("");
          dialogRef.current?.showModal();
        }}
        type="button"
      >
        {triggerLabel}
      </button>
      <dialog className="confirm-dialog" ref={dialogRef}>
        <form action={action} className="confirm-dialog-card">
          <div>
            <p className="eyebrow">Confirm deletion</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
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
              onClick={() => dialogRef.current?.close()}
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
      </dialog>
    </>
  );
}
