"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function RecordSidePanel({
  closeHref,
  title,
  children,
  loading = false,
}: {
  closeHref: string;
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push(closeHref, { scroll: false });
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closeHref, router]);

  return (
    <div className="record-panel-layer">
      <button
        aria-label="Close record"
        className="record-panel-backdrop"
        onClick={() => router.push(closeHref, { scroll: false })}
        type="button"
      />
      <aside
        aria-label={title}
        aria-busy={loading}
        aria-modal="true"
        className={`record-side-panel ${loading ? "is-loading" : ""}`}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Close record"
          className="icon-button record-panel-close"
          onClick={() => router.push(closeHref, { scroll: false })}
          type="button"
        >
          <X size={17} />
        </button>
        {children}
      </aside>
    </div>
  );
}
