"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { refreshPortalDataAction } from "@/app/actions/portal";

export function RefreshButton({
  label = "Refresh",
}: {
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="button secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshPortalDataAction();
          router.refresh();
        })
      }
      type="button"
    >
      <RefreshCw className={pending ? "spin-icon" : undefined} size={14} />
      {label}
    </button>
  );
}
