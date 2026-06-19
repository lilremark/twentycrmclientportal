"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function HealthRefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="button secondary"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      type="button"
    >
      <RefreshCw className={pending ? "spin-icon" : undefined} size={15} />
      {pending ? "Checking..." : "Run checks"}
    </button>
  );
}
