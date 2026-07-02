"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { FileText, List, Paperclip } from "lucide-react";

type RecordPanelTab = "fields" | "notes" | "files";

const tabs: Array<{
  id: RecordPanelTab;
  label: string;
  icon: typeof List;
}> = [
  { id: "fields", label: "Fields", icon: List },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "files", label: "Files", icon: Paperclip },
];

export function RecordPanelTabs({
  fields,
  notes,
  files,
  noteCount = 0,
  fileCount = 0,
}: {
  fields: ReactNode;
  notes?: ReactNode;
  files?: ReactNode;
  noteCount?: number;
  fileCount?: number;
}) {
  const [activeTab, setActiveTab] = useState<RecordPanelTab>("fields");
  const viewportRef = useRef<HTMLDivElement>(null);

  const content: Record<RecordPanelTab, ReactNode> = {
    fields,
    notes: notes ?? (
      <EmptyTab
        description="Notes are not enabled for this portal view."
        icon={<FileText size={18} />}
        title="No notes available"
      />
    ),
    files: files ?? (
      <EmptyTab
        description="File sharing is not enabled for this portal view."
        icon={<Paperclip size={18} />}
        title="No files available"
      />
    ),
  };

  const selectTab = (tab: RecordPanelTab) => {
    setActiveTab(tab);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    const nextTab = tabs[nextIndex].id;
    selectTab(nextTab);
    document.getElementById(`record-tab-${nextTab}`)?.focus();
  };

  return (
    <div className="record-panel-tabs-shell">
      <div aria-label="Record sections" className="record-panel-tabs" role="tablist">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const count = tab.id === "notes" ? noteCount : tab.id === "files" ? fileCount : null;
          return (
            <button
              aria-controls={`record-tabpanel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className="record-panel-tab"
              id={`record-tab-${tab.id}`}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              role="tab"
              tabIndex={activeTab === tab.id ? 0 : -1}
              type="button"
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {count !== null && count > 0 ? <small>{count}</small> : null}
            </button>
          );
        })}
      </div>
      <div className="record-panel-tab-viewport" ref={viewportRef}>
        {tabs.map((tab) => (
          <section
            aria-labelledby={`record-tab-${tab.id}`}
            className="record-panel-tabpanel"
            hidden={activeTab !== tab.id}
            id={`record-tabpanel-${tab.id}`}
            key={tab.id}
            role="tabpanel"
            tabIndex={0}
          >
            {content[tab.id]}
          </section>
        ))}
      </div>
    </div>
  );
}

function EmptyTab({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="record-panel-empty-tab">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
