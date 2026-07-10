"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Download,
  Grip,
  ImagePlus,
  Maximize2,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sun,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import type {
  PortalDashboardWidgetLayout,
} from "@/lib/db/schema";
import type {
  DashboardListItem,
  DashboardChartPoint,
  DashboardResult,
} from "@/lib/portal-dashboard";
import {
  normalizeDashboardLayout,
  resolveDashboardLayouts,
} from "@/lib/portal-dashboard";

const GRID_COLUMNS = 12;
const ROW_HEIGHT = 74;
const CHART_COLORS = [
  "#4662d5",
  "#20a776",
  "#e2a031",
  "#d4534f",
  "#7c5cff",
  "#2188a8",
  "#b061b3",
  "#68758a",
];

type LayoutMap = Record<string, PortalDashboardWidgetLayout>;

function clampLayout(layout: PortalDashboardWidgetLayout) {
  const w = Math.min(Math.max(layout.w, 2), GRID_COLUMNS);
  const h = Math.min(Math.max(layout.h, 2), 8);
  return {
    x: Math.min(Math.max(layout.x, 0), GRID_COLUMNS - w),
    y: Math.max(layout.y, 0),
    w,
    h,
  };
}

function BarChart({ points }: { points: DashboardChartPoint[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="dashboard-bar-chart">
      {points.map((point, index) => (
        <div className="dashboard-bar-row" key={point.label}>
          <span title={point.label}>{point.label}</span>
          <div>
            <i
              style={
                {
                  "--bar-color": CHART_COLORS[index % CHART_COLORS.length],
                  "--bar-width": `${Math.max((point.value / max) * 100, 2)}%`,
                } as CSSProperties
              }
            />
          </div>
          <strong>{point.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ points }: { points: DashboardChartPoint[] }) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const segments = points.reduce<
    Array<DashboardChartPoint & {
      color: string;
      dasharray: string;
      dashoffset: number;
    }>
  >((items, point, index) => {
    const length = total ? (point.value / total) * 100 : 0;
    const previousLength = items.reduce((sum, item) => {
      const [value] = item.dasharray.split(" ");
      return sum + Number(value);
    }, 0);
    return [
      ...items,
      {
        ...point,
        color: CHART_COLORS[index % CHART_COLORS.length],
        dasharray: `${length} ${100 - length}`,
        dashoffset: 25 - previousLength,
      },
    ];
  }, []);

  return (
    <div className="dashboard-donut-chart">
      <svg aria-hidden="true" viewBox="0 0 42 42">
        <circle className="dashboard-donut-track" cx="21" cy="21" r="15.9" />
        {segments.map((segment) => (
          <circle
            className="dashboard-donut-segment"
            cx="21"
            cy="21"
            key={segment.label}
            r="15.9"
            stroke={segment.color}
            strokeDasharray={segment.dasharray}
            strokeDashoffset={segment.dashoffset}
          />
        ))}
      </svg>
      <div className="dashboard-legend">
        {segments.map((segment) => (
          <div key={segment.label}>
            <i style={{ "--dot-color": segment.color } as CSSProperties} />
            <span title={segment.label}>{segment.label}</span>
            <strong>{segment.value.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ points }: { points: DashboardChartPoint[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="dashboard-trend-chart">
      {points.map((point, index) => (
        <div className="dashboard-trend-column" key={`${point.label}-${index}`}>
          <span
            style={
              {
                "--trend-height": `${Math.max((point.value / max) * 100, 8)}%`,
                "--trend-color": CHART_COLORS[index % CHART_COLORS.length],
              } as CSSProperties
            }
          />
          <strong>{point.value.toLocaleString()}</strong>
          <small title={point.label}>{point.label}</small>
        </div>
      ))}
    </div>
  );
}

function RecordList({ items }: { items: DashboardListItem[] }) {
  return (
    <div className="dashboard-record-list">
      {items.map((item) => (
        <div className="dashboard-record-list-item" key={item.id}>
          <span title={item.label}>{item.label}</span>
          <small>{item.meta}</small>
        </div>
      ))}
    </div>
  );
}

function DashboardCard({
  item,
  editing,
  onMoveStart,
  onResizeStart,
  contentEditing = false,
  onLabelChange,
}: {
  item: DashboardResult;
  editing: boolean;
  onMoveStart?: (event: ReactPointerEvent, id: string) => void;
  onResizeStart?: (event: ReactPointerEvent, id: string) => void;
  contentEditing?: boolean;
  onLabelChange?: (id: string, label: string) => void;
}) {
  const style = {
    gridColumn: `${item.layout.x + 1} / span ${item.layout.w}`,
    gridRow: `${item.layout.y + 1} / span ${item.layout.h}`,
  } as CSSProperties;

  return (
    <article
      className={`card dashboard-card ${
        item.type === "number" ? "metric-card" : "chart-card"
      } ${editing ? "is-editing" : ""}`}
      style={style}
    >
      {editing ? (
        <button
          aria-label={`Move ${item.label}`}
          className="dashboard-card-move"
          onPointerDown={(event) => onMoveStart?.(event, item.id)}
          title="Move"
          type="button"
        >
          <Grip size={15} />
        </button>
      ) : null}

      {item.type === "embed" ? (
        <div className="dashboard-embed-widget">
          <span contentEditable={contentEditing} onBlur={(event) => onLabelChange?.(item.id, event.currentTarget.textContent ?? "")} suppressContentEditableWarning>{item.label}</span>
          <iframe
            allow="fullscreen"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-forms allow-popups allow-scripts"
            src={item.embedUrl}
            title={item.label}
          />
        </div>
      ) : item.type === "number" ? (
        <>
          <span contentEditable={contentEditing} onBlur={(event) => onLabelChange?.(item.id, event.currentTarget.textContent ?? "")} suppressContentEditableWarning>{item.label}</span>
          <strong>{item.value}</strong>
        </>
      ) : item.type === "list" ? (
        <>
          <header>
            <div>
              <span contentEditable={contentEditing} onBlur={(event) => onLabelChange?.(item.id, event.currentTarget.textContent ?? "")} suppressContentEditableWarning>{item.label}</span>
              <strong>{item.total.toLocaleString()}</strong>
            </div>
          </header>
          {item.items.length ? (
            <RecordList items={item.items} />
          ) : (
            <p className="dashboard-empty-chart">No records are visible yet.</p>
          )}
        </>
      ) : (
        <>
          <header>
            <div>
              <span contentEditable={contentEditing} onBlur={(event) => onLabelChange?.(item.id, event.currentTarget.textContent ?? "")} suppressContentEditableWarning>{item.label}</span>
              <strong>{item.total.toLocaleString()}</strong>
            </div>
          </header>
          {item.points.length ? (
            item.type === "bar" ? (
              <BarChart points={item.points} />
            ) : item.type === "trend" ? (
              <TrendChart points={item.points} />
            ) : (
              <DonutChart points={item.points} />
            )
          ) : (
            <p className="dashboard-empty-chart">No grouped data yet.</p>
          )}
        </>
      )}

      {editing ? (
        <button
          aria-label={`Resize ${item.label}`}
          className="dashboard-card-resize"
          onPointerDown={(event) => onResizeStart?.(event, item.id)}
          title="Resize"
          type="button"
        >
          <Maximize2 size={14} />
        </button>
      ) : null}
    </article>
  );
}

function PrintPreview({
  items,
  title,
  onClose,
}: {
  items: DashboardResult[];
  title: string;
  onClose: () => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const initialLayouts = useMemo(
    () =>
      Object.fromEntries(items.map((item) => [item.id, item.layout])) as LayoutMap,
    [items],
  );
  const [pdfLayouts, setPdfLayouts] = useState<LayoutMap>(initialLayouts);
  const [editing, setEditing] = useState(true);
  const [cardTone, setCardTone] = useState<"light" | "dark">("light");
  const [reportEyebrow, setReportEyebrow] = useState("Dashboard report");
  const [reportTitle, setReportTitle] = useState(title);
  const [reportSubtitle, setReportSubtitle] = useState(new Date().toLocaleDateString());
  const [footerText, setFooterText] = useState("Confidential client report");
  const [textBlocks, setTextBlocks] = useState<Array<{ id: string; text: string }>>([]);
  const [images, setImages] = useState<Array<{ id: string; src: string; alt: string }>>([]);
  const [customizing, setCustomizing] = useState(false);
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});
  const [pdfZoom, setPdfZoom] = useState(100);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const previewItems = items.map((item, index) => ({
    ...item,
    label: labelOverrides[item.id] ?? item.label,
    layout: normalizeDashboardLayout(
      pdfLayouts[item.id] ?? item.layout,
      item.type,
      index,
    ),
  }));
  const occupiedRows = Math.max(
    ...previewItems.map((item) => item.layout.y + item.layout.h),
    1,
  );
  const printRowHeight = Math.max(42, Math.min(70, Math.floor(760 / occupiedRows)));
  const startPdfInteraction = (
    event: ReactPointerEvent,
    id: string,
    mode: "move" | "resize",
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const grid = gridRef.current;
    const start = pdfLayouts[id] ?? initialLayouts[id];
    if (!grid || !start) return;
    const rect = grid.getBoundingClientRect();
    const cellWidth = rect.width / GRID_COLUMNS;
    const rowHeight = printRowHeight;
    const startX = event.clientX;
    const startY = event.clientY;

    const move = (pointerEvent: PointerEvent) => {
      const dx = Math.round((pointerEvent.clientX - startX) / cellWidth);
      const dy = Math.round((pointerEvent.clientY - startY) / rowHeight);
      setPdfLayouts((current) => ({
        ...current,
        [id]: clampLayout(
          mode === "move"
            ? { ...start, x: start.x + dx, y: start.y + dy }
            : { ...start, w: start.w + dx, h: start.h + dy },
        ),
      }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return createPortal(
    <div className="dashboard-pdf-modal" role="dialog" aria-modal="true">
      <div className="dashboard-pdf-shell">
        <header className="dashboard-pdf-toolbar">
          <div>
            <strong>PDF preview</strong>
            <span>{title}</span>
          </div>
          <div className="dashboard-pdf-controls">
            <div className="segmented-control" aria-label="PDF card style">
              <button
                aria-pressed={cardTone === "light"}
                className={cardTone === "light" ? "active" : ""}
                onClick={() => setCardTone("light")}
                type="button"
              >
                <Sun size={14} />
                Light cards
              </button>
              <button
                aria-pressed={cardTone === "dark"}
                className={cardTone === "dark" ? "active" : ""}
                onClick={() => setCardTone("dark")}
                type="button"
              >
                Dark cards
              </button>
            </div>
            <button
              className="button secondary"
              onClick={() => setEditing((current) => !current)}
              type="button"
            >
              <SlidersHorizontal size={16} />
              {editing ? "Done arranging" : "Arrange PDF"}
            </button>
            <button
              className="button secondary"
              onClick={() => setPdfLayouts(initialLayouts)}
              type="button"
            >
              <RotateCcw size={16} />
              Reset PDF
            </button>
            <div aria-label="PDF zoom" className="dashboard-pdf-zoom" role="group">
              <button aria-label="Zoom out" disabled={pdfZoom <= 70} onClick={() => setPdfZoom((current) => Math.max(70, current - 10))} type="button"><ZoomOut size={15} /></button>
              <span>{pdfZoom}%</span>
              <button aria-label="Zoom in" disabled={pdfZoom >= 150} onClick={() => setPdfZoom((current) => Math.min(150, current + 10))} type="button"><ZoomIn size={15} /></button>
            </div>
            <button className="button secondary" onClick={() => setCustomizing((current) => !current)} type="button">
              <Type size={16} />
              {customizing ? "Done editing text" : "Edit text"}
            </button>
            {customizing ? (
              <>
                <button className="button secondary" onClick={() => setTextBlocks((current) => [...current, { id: crypto.randomUUID(), text: "New text block" }])} type="button"><Type size={15} /> Add text</button>
                <button className="button secondary" onClick={() => imageInputRef.current?.click()} type="button"><ImagePlus size={15} /> Add image</button>
              </>
            ) : null}
            <button className="button" onClick={() => window.print()} type="button">
              <Download size={16} />
              Download PDF
            </button>
            <button aria-label="Close PDF preview" className="icon-button" onClick={onClose} type="button">
              <X size={17} />
            </button>
          </div>
        </header>
        <input accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file || file.size > 5 * 1024 * 1024 || !file.type.startsWith("image/")) return;
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" && setImages((current) => [...current, { id: crypto.randomUUID(), src: reader.result as string, alt: file.name }]);
          reader.readAsDataURL(file);
          event.target.value = "";
        }} ref={imageInputRef} type="file" />
        <div className="dashboard-print-area">
          <section
            className={`dashboard-pdf-page dashboard-pdf-tone-${cardTone}`}
            style={{ "--pdf-zoom": pdfZoom / 100 } as CSSProperties}
          >
            <div className="dashboard-pdf-safe-frame" aria-hidden="true">
              <span>Bleed / print-safe area</span>
            </div>
            <header className="dashboard-pdf-page-header">
              <p contentEditable={customizing} onBlur={(event) => setReportEyebrow(event.currentTarget.textContent ?? "") } suppressContentEditableWarning>{reportEyebrow}</p>
              <h2 contentEditable={customizing} onBlur={(event) => setReportTitle(event.currentTarget.textContent ?? "") } suppressContentEditableWarning>{reportTitle}</h2>
              <span contentEditable={customizing} onBlur={(event) => setReportSubtitle(event.currentTarget.textContent ?? "") } suppressContentEditableWarning>{reportSubtitle}</span>
            </header>
            {textBlocks.length || images.length ? <div className="dashboard-pdf-custom-content">
              {textBlocks.map((block) => <div className="dashboard-pdf-text-block" key={block.id}><p contentEditable={customizing} onBlur={(event) => setTextBlocks((current) => current.map((item) => item.id === block.id ? { ...item, text: event.currentTarget.textContent ?? "" } : item))} suppressContentEditableWarning>{block.text}</p>{customizing ? <button aria-label="Remove text box" onClick={() => setTextBlocks((current) => current.filter((item) => item.id !== block.id))} type="button"><X size={13} /></button> : null}</div>)}
              {images.map((image) => <figure key={image.id}><Image alt={image.alt} height={400} src={image.src} unoptimized width={800} />{customizing ? <button aria-label="Remove image" onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))} type="button"><X size={13} /></button> : null}</figure>)}
            </div> : null}
            <div
              className={`dashboard-grid dashboard-pdf-grid ${
                editing ? "is-editing" : ""
              }`}
              ref={gridRef}
              style={
                {
                  "--dashboard-row-height": `${printRowHeight}px`,
                } as CSSProperties
              }
            >
              {previewItems.map((item) => (
                <DashboardCard
                  contentEditing={customizing}
                  editing={editing}
                  item={item}
                  key={item.id}
                  onLabelChange={(id, label) => setLabelOverrides((current) => ({ ...current, [id]: label }))}
                  onMoveStart={(event, id) =>
                    startPdfInteraction(event, id, "move")
                  }
                  onResizeStart={(event, id) =>
                    startPdfInteraction(event, id, "resize")
                  }
                />
              ))}
            </div>
            <footer className="dashboard-pdf-page-footer" contentEditable={customizing} onBlur={(event) => setFooterText(event.currentTarget.textContent ?? "")} suppressContentEditableWarning>{footerText}</footer>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function DashboardReportSurface({
  items,
  title,
  editable = false,
  exportable = false,
  storageKey,
  onLayoutChange,
}: {
  items: DashboardResult[];
  title: string;
  editable?: boolean;
  exportable?: boolean;
  storageKey?: string;
  onLayoutChange?: (layouts: LayoutMap) => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const defaultLayouts = useMemo(
    () => {
      const resolved = resolveDashboardLayouts(items);
      return Object.fromEntries(
        items.map((item, index) => [item.id, resolved[index]]),
      ) as LayoutMap;
    },
    [items],
  );
  const [draftLayouts, setDraftLayouts] = useState<LayoutMap>({});
  const savedLayoutSnapshot = useSyncExternalStore(
    () => () => undefined,
    () =>
      storageKey && typeof window !== "undefined"
        ? window.localStorage.getItem(storageKey) ?? ""
        : "",
    () => "",
  );
  const savedLayouts = useMemo(() => {
    if (storageKey) {
      try {
        return JSON.parse(savedLayoutSnapshot || "{}") as LayoutMap;
      } catch {
        return {};
      }
    }
    return {};
  }, [savedLayoutSnapshot, storageKey]);
  const layouts = useMemo(
    () => ({ ...defaultLayouts, ...savedLayouts, ...draftLayouts }),
    [defaultLayouts, draftLayouts, savedLayouts],
  );

  const collisionSafeLayouts = resolveDashboardLayouts(
    items.map((item) => ({
      type: item.type,
      layout: layouts[item.id] ?? item.layout,
    })),
  );
  const resolvedItems = items.map((item, index) => ({
    ...item,
    layout: collisionSafeLayouts[index],
  }));

  const commitLayouts = (updater: (current: LayoutMap) => LayoutMap) => {
    const next = updater(layouts);
    setDraftLayouts(next);
    onLayoutChange?.(next);
  };

  const startInteraction = (
    event: ReactPointerEvent,
    id: string,
    mode: "move" | "resize",
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const grid = gridRef.current;
    const start = layouts[id] ?? defaultLayouts[id];
    if (!grid || !start) return;
    const rect = grid.getBoundingClientRect();
    const cellWidth = rect.width / GRID_COLUMNS;
    const startX = event.clientX;
    const startY = event.clientY;

    const move = (pointerEvent: PointerEvent) => {
      const dx = Math.round((pointerEvent.clientX - startX) / cellWidth);
      const dy = Math.round((pointerEvent.clientY - startY) / ROW_HEIGHT);
      commitLayouts((current) => ({
        ...current,
        [id]: clampLayout(
          mode === "move"
            ? { ...start, x: start.x + dx, y: start.y + dy }
            : { ...start, w: start.w + dx, h: start.h + dy },
        ),
      }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const savePersonalLayout = () => {
    if (storageKey) {
      window.localStorage.setItem(storageKey, JSON.stringify(layouts));
    }
    setEditing(false);
  };
  const resetLayout = () => {
    if (storageKey) {
      window.localStorage.removeItem(storageKey);
    }
    setDraftLayouts({});
    onLayoutChange?.(defaultLayouts);
  };

  return (
    <div className="dashboard-surface">
      {(editable || exportable) && items.length ? (
        <div className="page-actions dashboard-actions">
          {editable ? (
            <>
              <button
                className="button secondary"
                onClick={() => setEditing((current) => !current)}
                type="button"
              >
                <SlidersHorizontal size={16} />
                {editing ? "Done editing" : "Edit layout"}
              </button>
              {editing && storageKey ? (
                <button className="button secondary" onClick={savePersonalLayout} type="button">
                  <Save size={16} />
                  Save layout
                </button>
              ) : null}
              <button className="button secondary" onClick={resetLayout} type="button">
                <RotateCcw size={16} />
                Reset
              </button>
            </>
          ) : null}
          {exportable ? (
            <button className="button" onClick={() => setPreviewOpen(true)} type="button">
              <Download size={16} />
              Export PDF
            </button>
          ) : null}
        </div>
      ) : null}

      <section
        aria-label={`${title} dashboard`}
        className={`dashboard-grid ${editing ? "is-editing" : ""}`}
        ref={gridRef}
        style={{ "--dashboard-row-height": `${ROW_HEIGHT}px` } as CSSProperties}
      >
        {resolvedItems.map((item) => (
          <DashboardCard
            editing={editing}
            item={item}
            key={item.id}
            onMoveStart={(event, id) => startInteraction(event, id, "move")}
            onResizeStart={(event, id) => startInteraction(event, id, "resize")}
          />
        ))}
      </section>

      {previewOpen ? (
        <PrintPreview
          items={resolvedItems}
          onClose={() => setPreviewOpen(false)}
          title={title}
        />
      ) : null}
    </div>
  );
}
