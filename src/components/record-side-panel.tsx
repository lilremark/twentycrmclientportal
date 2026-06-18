"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const closingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);

  const closePanel = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      router.push(closeHref, { scroll: false });
    }, 120);
  }, [closeHref, router]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closePanel]);

  return (
    <div className={`record-panel-layer ${closing ? "is-closing" : ""}`}>
      <button
        aria-label="Close record"
        className={`record-panel-backdrop ${closing ? "is-closing" : ""}`}
        onClick={closePanel}
        type="button"
      />
      <aside
        aria-label={title}
        aria-busy={loading}
        aria-modal="true"
        className={[
          "record-side-panel",
          loading ? "is-loading" : "",
          closing ? "is-closing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Close record"
          className="icon-button record-panel-close"
          onClick={closePanel}
          type="button"
        >
          <X size={17} />
        </button>
        {children}
      </aside>
    </div>
  );
}
