"use client";

import { useCallback, useId, useState } from "react";

import { ConfirmationModal } from "@/components/confirmation-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <Button
        disabled={disabled}
        onClick={() => {
          setValue("");
          setOpen(true);
        }}
        type="button"
        variant="destructive"
      >
        {triggerLabel}
      </Button>
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
              <Input
                autoComplete="off"
                id={inputId}
                onChange={(event) => setValue(event.target.value)}
                value={value}
              />
            </label>
            <div className="form-actions">
              <Button onClick={close} type="button" variant="outline">
                Cancel
              </Button>
              <Button
                disabled={!confirmed}
                formAction={action}
                type="submit"
                variant="destructive"
              >
                Delete
              </Button>
            </div>
          </form>
        </ConfirmationModal>
      ) : null}
    </>
  );
}
