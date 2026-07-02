"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const DEFAULT_PANEL_WIDTH = 560;
const MINIMUM_PANEL_WIDTH = 380;
const PANEL_WIDTH_STORAGE_KEY = "record-panel-width";
const PANEL_CLOSE_DURATION = 240;

function panelWidthBounds() {
  const frame = document.querySelector<HTMLElement>(".app-frame");
  const sidebarWidth = frame
    ? Number.parseFloat(getComputedStyle(frame).getPropertyValue("--sidebar-width")) || 0
    : 0;
  const workspaceMinimum = 620;
  const maximum = Math.max(
    320,
    Math.min(
      Math.floor(window.innerWidth * 0.58),
      window.innerWidth - sidebarWidth - workspaceMinimum,
    ),
  );
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
  onClose,
  onOpened,
  title,
  children,
  loading = false,
}: {
  closeHref?: string;
  onClose?: () => void;
  onOpened?: () => void;
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const appFrameRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);
  const openedRef = useRef(false);
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
    appFrameRef.current?.classList.remove("record-panel-opening");
    appFrameRef.current?.classList.add("record-panel-closing");
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      if (onClose) onClose();
      else if (closeHref) router.push(closeHref, { scroll: false });
    }, PANEL_CLOSE_DURATION);
  }, [closeHref, onClose, router]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [closePanel]);

  useEffect(() => {
    if (
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    const frame = requestAnimationFrame(() => {
      if (!openedRef.current) {
        openedRef.current = true;
        onOpened?.();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [onOpened]);

  useLayoutEffect(() => {
    const savedWidth = Number(
      typeof localStorage?.getItem === "function"
        ? localStorage.getItem(PANEL_WIDTH_STORAGE_KEY)
        : 0,
    );
    const initialBounds = panelWidthBounds();
    const initialWidth = clampPanelWidth(
      Number.isFinite(savedWidth) && savedWidth > 0
        ? savedWidth
        : DEFAULT_PANEL_WIDTH,
    );
    panelRef.current?.style.setProperty(
      "--record-panel-width",
      `${initialWidth}px`,
    );
    const appFrame =
      panelRef.current?.closest<HTMLElement>(".app-frame") ??
      document.querySelector<HTMLElement>(".app-frame");
    appFrameRef.current = appFrame ?? null;
    appFrame?.classList.add("record-panel-open", "record-panel-opening");
    appFrame?.style.setProperty("--record-panel-width", `${initialWidth}px`);
    const finishOpening = (event: AnimationEvent) => {
      if (event.animationName === "record-workspace-smooth-open") {
        appFrame?.classList.remove("record-panel-opening");
      }
    };
    appFrame?.addEventListener("animationend", finishOpening);
    const initializationFrame = requestAnimationFrame(() => {
      setPanelBounds(initialBounds);
      setPanelWidth(initialWidth);
    });

    const handleResize = () => {
      const bounds = panelWidthBounds();
      setPanelBounds(bounds);
      setPanelWidth((current) => {
        const next = Math.min(bounds.maximum, Math.max(bounds.minimum, current));
        appFrame?.style.setProperty("--record-panel-width", `${next}px`);
        return next;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(initializationFrame);
      window.removeEventListener("resize", handleResize);
      appFrame?.removeEventListener("animationend", finishOpening);
      appFrame?.classList.remove("record-panel-open");
      appFrame?.classList.remove("record-panel-closing");
      appFrame?.classList.remove("record-panel-opening");
      appFrame?.style.removeProperty("--record-panel-width");
      appFrameRef.current = null;
    };
  }, []);

  const savePanelWidth = useCallback((width: number) => {
    const nextWidth = clampPanelWidth(width);
    setPanelWidth(nextWidth);
    if (typeof localStorage?.setItem === "function") {
      localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(nextWidth));
    }
    appFrameRef.current?.style.setProperty(
      "--record-panel-width",
      `${nextWidth}px`,
    );
  }, []);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1024) return;
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
      savePanelWidth(Number.POSITIVE_INFINITY);
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
      <aside
        aria-label={title}
        aria-busy={loading}
        className={[
          "record-side-panel",
          loading ? "is-loading" : "",
          closing ? "is-closing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={panelRef}
        role="complementary"
        onAnimationEnd={(event) => {
          if (
            event.animationName === "record-panel-smooth-open" &&
            !openedRef.current
          ) {
            openedRef.current = true;
            onOpened?.();
          }
        }}
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
          title="Close record details"
          type="button"
        >
          <X size={17} />
        </button>
        {children}
      </aside>
    </div>
  );
}
