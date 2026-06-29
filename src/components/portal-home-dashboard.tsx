"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Check,
  Clock3,
  LayoutGrid,
  Rows3,
  Settings2,
} from "lucide-react";

type PortalSummary = {
  id: string;
  slug: string;
  label: string;
  objectLabel: string;
  widgetCount: number;
  activityCount: number;
  recentRecords: Array<{
    id: string;
    label: string;
    action: string;
    time: string;
    relativeTime: string;
  }>;
};

type PortalActivity = {
  id: string;
  label: string;
  portalLabel: string;
  portalSlug: string | null;
  recordId: string | null;
  status: string;
  time: string;
  titleTime: string;
  relativeTime: string;
};

const DASHBOARD_STORAGE_KEY = "portal-home-layout-v1";

export function PortalHomeDashboard({
  portals,
  activities,
}: {
  portals: PortalSummary[];
  activities: PortalActivity[];
}) {
  const defaultOrder = useMemo(() => portals.map((portal) => portal.id), [portals]);
  const [order, setOrder] = useState(defaultOrder);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [customizing, setCustomizing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!stored) return;
    try {
      const saved = JSON.parse(stored) as { order?: string[]; hidden?: string[] };
      const known = new Set(defaultOrder);
      const savedOrder = (saved.order ?? []).filter((id) => known.has(id));
      const frame = requestAnimationFrame(() => {
        setOrder([...savedOrder, ...defaultOrder.filter((id) => !savedOrder.includes(id))]);
        setHidden(new Set((saved.hidden ?? []).filter((id) => known.has(id))));
      });
      return () => cancelAnimationFrame(frame);
    } catch {
      localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    }
  }, [defaultOrder]);

  const persist = (nextOrder: string[], nextHidden: Set<string>) => {
    localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ order: nextOrder, hidden: [...nextHidden] }),
    );
  };

  const togglePortal = (id: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(order, next);
      return next;
    });
  };

  const movePortal = (id: string, direction: -1 | 1) => {
    const index = order.indexOf(id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= order.length) return;
    const next = [...order];
    [next[index], next[destination]] = [next[destination], next[index]];
    setOrder(next);
    persist(next, hidden);
  };

  const orderedPortals = order
    .map((id) => portals.find((portal) => portal.id === id))
    .filter((portal): portal is PortalSummary => Boolean(portal));
  const visiblePortals = orderedPortals.filter((portal) => !hidden.has(portal.id));
  const totalActivity = portals.reduce((sum, portal) => sum + portal.activityCount, 0);
  const totalRecentRecords = new Set(
    portals.flatMap((portal) => portal.recentRecords.map((record) => record.id)),
  ).size;

  return (
    <div className="portal-home-dashboard">
      <section className="portal-home-hero">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h2>Your client portals, at a glance.</h2>
          <p>
            Review shared work, recent record changes, and reporting dashboards
            from one place.
          </p>
        </div>
        <button
          aria-expanded={customizing}
          className="button secondary portal-customize-button"
          onClick={() => setCustomizing((current) => !current)}
          type="button"
        >
          {customizing ? <Check size={15} /> : <Settings2 size={15} />}
          {customizing ? "Done" : "Customize"}
        </button>
        <div className="portal-home-stats" aria-label="Portal summary">
          <div><LayoutGrid size={16} /><strong>{portals.length}</strong><span>Portals</span></div>
          <div><Activity size={16} /><strong>{totalActivity}</strong><span>Recent changes</span></div>
          <div><Rows3 size={16} /><strong>{totalRecentRecords}</strong><span>Active records</span></div>
        </div>
      </section>

      {customizing ? (
        <section className="portal-customizer" aria-label="Customize dashboard portals">
          <div>
            <strong>Portal cards</strong>
            <span>Choose what appears and set the order. This layout is saved on this device.</span>
          </div>
          <div className="portal-customizer-list">
            {orderedPortals.map((portal, index) => (
              <div className="portal-customizer-row" key={portal.id}>
                <label>
                  <input
                    checked={!hidden.has(portal.id)}
                    onChange={() => togglePortal(portal.id)}
                    type="checkbox"
                  />
                  <span>{portal.label}</span>
                </label>
                <div>
                  <button aria-label={`Move ${portal.label} up`} disabled={index === 0} onClick={() => movePortal(portal.id, -1)} type="button"><ArrowUp size={14} /></button>
                  <button aria-label={`Move ${portal.label} down`} disabled={index === orderedPortals.length - 1} onClick={() => movePortal(portal.id, 1)} type="button"><ArrowDown size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="portal-home-section">
        <div className="portal-home-section-heading">
          <div><p className="eyebrow">Shared with you</p><h3>Portal workspaces</h3></div>
          <span>{visiblePortals.length} visible</span>
        </div>
        <div className="portal-overview-grid">
          {visiblePortals.map((portal) => (
            <article className="portal-overview-card" key={portal.id}>
              <div className="portal-overview-card-heading">
                <span className="portal-glyph"><Rows3 size={17} /></span>
                <div><h3>{portal.label}</h3><p>{portal.objectLabel}</p></div>
                <Link aria-label={`Open ${portal.label}`} href={`/portal/${portal.slug}`}><ArrowRight size={16} /></Link>
              </div>
              <div className="portal-overview-metrics">
                <span><Activity size={13} /><strong>{portal.activityCount}</strong> recent changes</span>
                <span><BarChart3 size={13} /><strong>{portal.widgetCount}</strong> report widgets</span>
              </div>
              <div className="portal-recent-records">
                <span className="portal-recent-label">Recently touched records</span>
                {portal.recentRecords.length ? portal.recentRecords.slice(0, 3).map((record) => (
                  <Link href={`/portal/${portal.slug}?record=${encodeURIComponent(record.id)}`} key={record.id}>
                    <span><strong>{record.label}</strong><small>{record.action}</small></span>
                    <time dateTime={record.time}>{record.relativeTime}</time>
                  </Link>
                )) : <p>No recent record changes.</p>}
              </div>
              <div className="portal-overview-actions">
                <Link href={`/portal/${portal.slug}`}>View records <ArrowRight size={13} /></Link>
                {portal.widgetCount ? <Link href={`/portal/${portal.slug}/reports`}>Open reports</Link> : null}
              </div>
            </article>
          ))}
        </div>
        {!visiblePortals.length ? <div className="portal-home-empty">No portal cards are visible. Use Customize to add one back.</div> : null}
      </section>

      <section className="portal-home-section portal-activity-card">
        <div className="portal-home-section-heading">
          <div><p className="eyebrow">Live trail</p><h3>Recent portal activity</h3></div>
          <span>Latest {activities.length}</span>
        </div>
        <div className="portal-activity-list">
          {activities.map((activity) => {
            const content = (
              <>
                <span className="activity-icon"><Clock3 size={15} /></span>
                <span className="portal-activity-copy"><strong>{activity.label}</strong><span>{activity.portalLabel}{activity.status === "failure" ? " · Failed" : ""}</span></span>
                <time dateTime={activity.time} title={activity.titleTime}>{activity.relativeTime}</time>
                {activity.portalSlug && activity.recordId ? <ArrowRight className="portal-activity-arrow" size={14} /> : null}
              </>
            );
            return activity.portalSlug && activity.recordId ? (
              <Link className="portal-activity-item" href={`/portal/${activity.portalSlug}?record=${encodeURIComponent(activity.recordId)}`} key={activity.id}>{content}</Link>
            ) : <div className="portal-activity-item" key={activity.id}>{content}</div>;
          })}
          {!activities.length ? <div className="portal-home-empty">No portal activity yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
