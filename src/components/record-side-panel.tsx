"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const DEFAULT_PANEL_WIDTH = 560;
const MINIMUM_PANEL_WIDTH = 380;
const PANEL_WIDTH_STORAGE_KEY = "record-panel-width";

function panelWidthBounds() {
  const maximum = Math.max(280, Math.floor(window.innerWidth * 0.5));
  return {
    minimum: Math.min(MINIMUM_PANEL_WIDTH, maximum),
    maximum,
  };
}

function clampPanelWidth(width: number) {
  const { minimum, maximum } = panelWidthBounds();
  return Math.min(maximum, Math.max(minimum, width));
}

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
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [panelBounds, setPanelBounds] = useState({
    minimum: MINIMUM_PANEL_WIDTH,
    maximum: DEFAULT_PANEL_WIDTH,
  });
  const [resizing, setResizing] = useState(false);

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

  useEffect(() => {
    const savedWidth = Number(localStorage.getItem(PANEL_WIDTH_STORAGE_KEY));
    const initializationFrame = requestAnimationFrame(() => {
      setPanelBounds(panelWidthBounds());
      setPanelWidth(
        clampPanelWidth(
          Number.isFinite(savedWidth) && savedWidth > 0
            ? savedWidth
            : DEFAULT_PANEL_WIDTH,
        ),
      );
    });

    const handleResize = () => {
      setPanelBounds(panelWidthBounds());
      setPanelWidth((current) => clampPanelWidth(current));
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(initializationFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const savePanelWidth = useCallback((width: number) => {
    const nextWidth = clampPanelWidth(width);
    setPanelWidth(nextWidth);
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(nextWidth));
  }, []);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth < 640) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    setResizing(true);

    const resize = (moveEvent: PointerEvent) => {
      savePanelWidth(window.innerWidth - moveEvent.clientX);
    };
    const stopResize = () => {
      setResizing(false);
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  };

  const resizeWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      savePanelWidth(panelWidth + step);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      savePanelWidth(panelWidth - step);
    } else if (event.key === "Home") {
      event.preventDefault();
      savePanelWidth(MINIMUM_PANEL_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      savePanelWidth(window.innerWidth * 0.5);
    }
  };

  return (
    <div
      className={[
        "record-panel-layer",
        closing ? "is-closing" : "",
        resizing ? "is-resizing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
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
        style={{ "--record-panel-width": `${panelWidth}px` } as React.CSSProperties}
        tabIndex={-1}
      >
        <div
          aria-label="Resize record details"
          aria-orientation="vertical"
          aria-valuemax={panelBounds.maximum}
          aria-valuemin={panelBounds.minimum}
          aria-valuenow={Math.round(panelWidth)}
          className="record-panel-resize-handle"
          onDoubleClick={() => savePanelWidth(DEFAULT_PANEL_WIDTH)}
          onKeyDown={resizeWithKeyboard}
          onPointerDown={startResize}
          role="separator"
          tabIndex={0}
          title="Drag to resize. Double-click to reset."
        >
          <span />
        </div>
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
