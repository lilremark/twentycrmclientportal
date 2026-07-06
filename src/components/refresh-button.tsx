"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { refreshPortalDataAction } from "@/app/actions/portal";

export function RefreshButton({
  label = "Refresh",
  iconOnly = false,
}: {
  label?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      aria-busy={pending}
      aria-label={pending ? "Refreshing record" : label}
      className={`button secondary ${iconOnly ? "refresh-icon-button" : ""}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshPortalDataAction();
          router.refresh();
        })
      }
      title={label}
      type="button"
    >
      <RefreshCw className={pending ? "spin-icon" : undefined} size={14} />
      {iconOnly ? null : label}
    </button>
  );
}
