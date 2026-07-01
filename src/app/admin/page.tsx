import Link from "next/link";

import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import {
  Activity,
  ArrowRight,
  Building2,
  CircleAlert,
  Database,
  Eye,
  FileClock,
  Rows3,
  UserPlus,
} from "lucide-react";

import { syncMetadataAction } from "@/app/actions/admin";
import { ConnectionTestButton } from "@/components/admin-actions";
import { db } from "@/lib/db";
import {
  auditEvents,
  clientAccounts,
  metadataSnapshots,
  portalViews,
  user,
} from "@/lib/db/schema";

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    "record.created": "Record created",
    "record.updated": "Record updated",
    "view.created": "Portal created",
    "view.updated": "Portal configuration updated",
    "invitation.created": "Portal invitation created",
    "invitation.accepted": "Portal invitation accepted",
  };
  return labels[action] ?? action.replaceAll(".", " ");
}

function ActivityIcon({ action }: { action: string }) {
  if (action.startsWith("record.")) return <Rows3 size={17} />;
  if (action.startsWith("invitation.")) return <UserPlus size={17} />;
  if (action.startsWith("view.")) return <Eye size={17} />;
  return <Activity size={17} />;
}

export default async function AdminOverviewPage() {
  const [latest, views, clients, recentActivity, activityToday] =
    await Promise.all([
      db
        .select()
        .from(metadataSnapshots)
        .orderBy(desc(metadataSnapshots.syncedAt))
        .limit(1)
        .then(([snapshot]) => snapshot),
      db
        .select()
        .from(portalViews)
        .orderBy(portalViews.navigationOrder, portalViews.label),
      db
        .select({ id: clientAccounts.id })
        .from(clientAccounts)
        .where(eq(clientAccounts.isActive, true)),
      db
        .select({
          id: auditEvents.id,
          action: auditEvents.action,
          objectName: auditEvents.objectName,
          recordId: auditEvents.recordId,
          status: auditEvents.status,
          createdAt: auditEvents.createdAt,
          userName: user.name,
        })
        .from(auditEvents)
        .leftJoin(user, eq(user.id, auditEvents.actorUserId))
        .where(
          or(
            like(auditEvents.action, "record.%"),
            like(auditEvents.action, "view.%"),
            like(auditEvents.action, "invitation.%"),
            eq(auditEvents.status, "external"),
          ),
        )
        .orderBy(desc(auditEvents.createdAt))
        .limit(20),
      db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(
          portalActivitySinceYesterday(),
        ),
    ]);

  const activeViews = views.filter((view) => view.isEnabled);
  const needsAttention = views.filter(
    (view) => !view.isEnabled || view.validationErrors.length,
  );

  return (
    <div className="page-stack">
      <div className="page-actions">
        <ConnectionTestButton />
        <form action={syncMetadataAction}>
          <button className="button" type="submit">
            <Database size={17} />
            Synchronize metadata
          </button>
        </form>
      </div>

      <section className="stat-grid">
        <StatCard label="Active portals" value={activeViews.length} />
        <StatCard label="Active clients" value={clients.length} />
        <StatCard label="Activity, 24 hours" value={activityToday.length} />
        <StatCard
          label="Synchronized objects"
          value={latest?.objects.length ?? 0}
        />
      </section>

      <section aria-labelledby="admin-metadata-heading" className="card admin-metadata-card">
        <div className="admin-metadata-heading">
          <div className="flex items-center gap-3">
            <span className="activity-icon">
              <Building2 size={17} />
            </span>
            <div>
              <h2 id="admin-metadata-heading">Twenty CRM metadata</h2>
              <p>
                {latest
                  ? `Last synchronized ${latest.syncedAt.toLocaleString()}`
                  : "Metadata has not been synchronized."}
              </p>
            </div>
          </div>
          <span className="badge">
            {latest ? `${latest.objects.length} objects` : "Not synchronized"}
          </span>
        </div>
        {latest?.objects.length ? (
          <div className="admin-metadata-list">
            {latest.objects.map((object) => (
              <div className="admin-metadata-object" key={object.id}>
                <div>
                  <strong>{object.labelPlural}</strong>
                  <span>{object.namePlural}</span>
                </div>
                <span>{object.fields.length} fields</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-metadata-empty">
            Synchronize metadata to display the available Twenty CRM objects.
          </div>
        )}
      </section>

      {needsAttention.length ? (
        <section className="preview-banner">
          <div>
            <strong className="flex items-center gap-2 text-sm">
              <CircleAlert size={17} />
              {needsAttention.length} portal
              {needsAttention.length === 1 ? "" : "s"} need attention
            </strong>
            <p>
              Disabled portals or schema validation errors should be corrected
              before inviting users.
            </p>
          </div>
          <Link className="button secondary" href="/admin/views">
            Review portals
          </Link>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
          <div>
            <h2 className="text-base font-bold">Active portals</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Open a scoped preview or edit the configuration.
            </p>
          </div>
          <Link className="text-sm font-semibold text-[var(--brand-primary)]" href="/admin/views">
            Manage all
          </Link>
        </div>
        <div className="portal-card-grid">
          {activeViews.map((view) => {
            const lastActivity = recentActivity.find(
              (event) =>
                event.recordId === view.id ||
                event.objectName === view.objectNameSingular,
            );
            return (
              <article className="card portal-summary-card" key={view.id}>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="activity-icon">
                      <Rows3 size={17} />
                    </span>
                    <span className="badge">Active</span>
                  </div>
                  <h3 className="mt-4 font-bold">{view.label}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {view.objectNamePlural} ·{" "}
                    {view.scopeMode === "all"
                      ? "All current records"
                      : view.scopeMode === "person"
                        ? "Person scoped"
                        : `${view.allowedRecordIds.length} specific records`}
                  </p>
                </div>
                <div>
                  <p className="mb-3 text-xs text-[var(--muted)]">
                    {lastActivity
                      ? `Last activity ${lastActivity.createdAt.toLocaleString()}`
                      : "No portal activity recorded yet"}
                  </p>
                  <div className="form-actions">
                    <Link
                      className="button secondary"
                      href={`/admin/views/${view.id}/preview`}
                    >
                      <Eye size={16} />
                      Preview
                    </Link>
                    <Link
                      className="text-xs font-semibold text-[var(--brand-primary)]"
                      href={`/admin/views/${view.id}`}
                    >
                      Configure <ArrowRight className="inline" size={13} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!activeViews.length ? (
          <div className="card empty-state mt-3">
            <div>
              <Rows3 className="mx-auto mb-3" size={24} />
              <p>No active portals are configured.</p>
              <Link
                className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-primary)]"
                href="/admin/views"
              >
                Create a portal view
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card table-shell">
        <div className="section-heading">
          <div>
            <h2>Recent portal activity</h2>
            <p>Record writes, portal changes, invitations, and webhooks.</p>
          </div>
          <Link className="button secondary" href="/admin/audit">
            <FileClock size={16} />
            Full audit
          </Link>
        </div>
        <div className="activity-list">
          {recentActivity.map((event) => (
            <div className="activity-item" key={event.id}>
              <span className="activity-icon">
                <ActivityIcon action={event.action} />
              </span>
              <div className="activity-copy">
                <strong>{activityLabel(event.action)}</strong>
                <span>
                  {event.userName ?? "Twenty webhook"}
                  {event.objectName ? ` · ${event.objectName}` : ""}
                  {event.status === "failure" ? " · Failed" : ""}
                </span>
              </div>
              <time className="activity-time">
                {event.createdAt.toLocaleString()}
              </time>
            </div>
          ))}
          {!recentActivity.length ? (
            <div className="empty-state">
              No portal activity has been recorded yet.
            </div>
          ) : null}
        </div>
      </section>

    </div>
  );
}

function portalActivitySinceYesterday() {
  return and(
    gte(auditEvents.createdAt, sql`now() - interval '24 hours'`),
    or(
      like(auditEvents.action, "record.%"),
      like(auditEvents.action, "view.%"),
      like(auditEvents.action, "invitation.%"),
      eq(auditEvents.status, "external"),
    ),
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="card stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
