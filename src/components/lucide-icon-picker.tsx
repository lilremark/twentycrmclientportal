"use client";

import { Check, ChevronDown, Search, icons, type LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const legacyIcons: Record<string, keyof typeof icons> = {
  briefcase: "BriefcaseBusiness",
  calendar: "CalendarDays",
  chart: "ChartBar",
  file: "FileText",
  folder: "Folder",
  records: "ClipboardList",
  table: "Table2",
  target: "Target",
  users: "Users",
};

function iconName(value: string) {
  return legacyIcons[value] ?? (value as keyof typeof icons);
}

function iconLabel(value: string) {
  return value
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

export function LucideIconPicker({
  defaultValue,
  id,
  name,
}: {
  defaultValue: string;
  id: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(192);
  const [value, setValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>();
  const resolvedName = iconName(value);
  const SelectedIcon = (icons[resolvedName] ?? icons.ClipboardList) as LucideIcon;
  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (Object.keys(icons) as Array<keyof typeof icons>)
      .filter((item) => !item.endsWith("Icon"))
      .filter((item) => !normalized || iconLabel(item).toLowerCase().includes(normalized))
      .sort((left, right) => left.localeCompare(right));
  }, [query]);
  const visibleOptions = options.slice(0, visibleCount);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const viewportPadding = 12;
      const width = Math.min(540, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(bounds.left, viewportPadding),
        window.innerWidth - width - viewportPadding,
      );
      const below = window.innerHeight - bounds.bottom - 6 - viewportPadding;
      const above = bounds.top - 6 - viewportPadding;
      const openBelow = below >= Math.min(360, above);
      setPopupStyle({
        left,
        width,
        maxHeight: Math.max(220, openBelow ? below : above),
        ...(openBelow
          ? { top: bounds.bottom + 6 }
          : { bottom: window.innerHeight - bounds.top + 6 }),
      });
    };
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      ) setOpen(false);
    };
    updatePosition();
    document.addEventListener("pointerdown", close);
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <div className="lucide-icon-picker" ref={rootRef}>
      <input id={id} name={name} type="hidden" value={value} />
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="lucide-icon-picker-trigger"
        onClick={() => {
          if (!open) {
            setQuery("");
            setVisibleCount(192);
          }
          setOpen((current) => !current);
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="lucide-icon-picker-glyph"><SelectedIcon size={17} /></span>
        <span>{iconLabel(resolvedName)}</span>
        <ChevronDown aria-hidden="true" size={15} />
      </button>
      {open && popupStyle ? createPortal(
        <div className="lucide-icon-picker-popover" ref={popupRef} style={popupStyle}>
          <label className="lucide-icon-picker-search">
            <Search aria-hidden="true" size={15} />
            <input
              autoFocus
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(192);
              }}
              placeholder="Search icons"
              type="search"
              value={query}
            />
          </label>
          <div className="lucide-icon-picker-results" role="listbox" aria-label="Available icons">
            {visibleOptions.map((item) => {
              const Icon = icons[item] as LucideIcon;
              const selected = item === resolvedName;
              return (
                <button
                  aria-label={iconLabel(item)}
                  aria-selected={selected}
                  className={selected ? "is-selected" : ""}
                  key={item}
                  onClick={() => {
                    setValue(item);
                    setOpen(false);
                  }}
                  role="option"
                  title={iconLabel(item)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={18} />
                  {selected ? <Check aria-hidden="true" className="lucide-icon-picker-check" size={11} /> : null}
                </button>
              );
            })}
          </div>
          <div className="lucide-icon-picker-footer">
            <span className="lucide-icon-picker-count">
              Showing {visibleOptions.length} of {options.length} icons
            </span>
            {visibleOptions.length < options.length ? (
              <button
                className="lucide-icon-picker-more"
                onClick={() => setVisibleCount((count) => count + 192)}
                type="button"
              >
                Show more
              </button>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
