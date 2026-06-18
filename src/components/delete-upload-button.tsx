"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

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
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="button danger compact-button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          await action();
          onDeleted?.();
          router.refresh();
        });
      }}
      type="button"
    >
      <Trash2 size={13} />
      {pending ? "Deleting..." : label}
    </button>
  );
}
