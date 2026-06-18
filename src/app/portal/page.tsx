import Link from "next/link";
import { ArrowRight, Rows3 } from "lucide-react";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { requirePortalContext } from "@/lib/access";
import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    "record.created": "Record created",
    "record.updated": "Record updated",
    "note.created": "Note added",
    "note.updated": "Note updated",
    "webhook.record_changed": "Record changed in Twenty",
  };
  return labels[action] ?? action.replaceAll(".", " ");
}

function relativeActivityTime(date: Date) {
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default async function PortalHomePage() {
  const context = await requirePortalContext();
  const views = context.views;
  const objectNames = [...new Set(views.map((view) => view.objectNameSingular))];
  const activities = objectNames.length
    ? await db
        .select({
          id: auditEvents.id,
          action: auditEvents.action,
          objectName: auditEvents.objectName,
          recordId: auditEvents.recordId,
          status: auditEvents.status,
          createdAt: auditEvents.createdAt,
        })
        .from(auditEvents)
        .where(
          and(
            inArray(auditEvents.objectName, objectNames),
            context.isAdmin
              ? undefined
              : context.clientAccountId
                ? eq(auditEvents.clientAccountId, context.clientAccountId)
                : isNull(auditEvents.clientAccountId),
          ),
        )
        .orderBy(desc(auditEvents.createdAt))
        .limit(8)
    : [];
  const viewByObject = new Map(
    views.map((view) => [view.objectNameSingular, view.label]),
  );

  return (
    <div className="page-stack">
      <div className="portal-card-grid">
        {views.map((view) => (
          <Link
            className="card portal-summary-card"
            href={`/portal/${view.slug}`}
            key={view.id}
          >
            <div>
              <span className="activity-icon mb-3">
                <Rows3 size={17} />
              </span>
              <h3 className="font-bold">{view.label}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                View and filter {view.objectNamePlural}.
              </p>
            </div>
            <div className="portal-card-meta">
              Open portal <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
      {!views.length ? (
        <p className="card empty-state text-sm">
          No portal views have been configured yet.
        </p>
      ) : null}
      <section className="card portal-activity-card">
        <div className="section-heading">
          <div>
            <h2>Recent activity</h2>
            <p>Record and note changes in portals you can access.</p>
          </div>
        </div>
        <div className="portal-activity-list">
          {activities.map((activity) => (
            <div className="portal-activity-item" key={activity.id}>
              <span className="activity-icon">
                <Rows3 size={16} />
              </span>
              <div>
                <strong>{activityLabel(activity.action)}</strong>
                <span>
                  {activity.objectName
                    ? viewByObject.get(activity.objectName) ?? activity.objectName
                    : "Portal"}
                  {activity.status === "failure" ? " · Failed" : ""}
                </span>
              </div>
              <time title={activity.createdAt.toLocaleString()}>
                {relativeActivityTime(activity.createdAt)}
              </time>
            </div>
          ))}
          {!activities.length ? (
            <div className="empty-state">No portal activity yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
