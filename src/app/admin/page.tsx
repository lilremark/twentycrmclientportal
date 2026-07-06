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
import { AdminOnboardingTour } from "@/components/admin-onboarding-tour";
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

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
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
    <>
      {query.tour === "1" ? <AdminOnboardingTour /> : null}
      <div className="portal-home-dashboard admin-home-dashboard">
      <section className="portal-home-hero admin-home-hero" data-tour-target="overview">
        <div className="page-actions admin-dashboard-actions">
          <ConnectionTestButton />
          <form action={syncMetadataAction}>
            <button className="button" type="submit"><Database size={16} />Synchronize metadata</button>
          </form>
        </div>
        <div className="portal-home-stats" aria-label="Administration summary">
          <div><Rows3 size={16} /><strong>{activeViews.length}</strong><span>Active portals</span></div>
          <div><Building2 size={16} /><strong>{clients.length}</strong><span>Active clients</span></div>
          <div><Activity size={16} /><strong>{activityToday.length}</strong><span>Changes today</span></div>
          <div><Database size={16} /><strong>{latest?.objects.length ?? 0}</strong><span>CRM objects</span></div>
        </div>
      </section>

      {needsAttention.length ? (
        <section className="preview-banner admin-attention-banner">
          <div>
            <strong className="flex items-center gap-2 text-sm">
              <CircleAlert size={17} />
              {needsAttention.length} portal
              {needsAttention.length === 1 ? "" : "s"} need attention
            </strong>
          </div>
          <Link className="button secondary" href="/admin/views">
            Review portals
          </Link>
        </section>
      ) : null}

      <section className="portal-home-section">
        <div className="portal-home-section-heading">
          <div><p className="eyebrow">Configured</p><h3>Active portals</h3></div>
          <Link className="button secondary portal-home-manage-link" href="/admin/views">Manage all</Link>
        </div>
        <div className="portal-overview-grid">
          {activeViews.map((view) => {
            const lastActivity = recentActivity.find(
              (event) =>
                event.recordId === view.id ||
                event.objectName === view.objectNameSingular,
            );
            return (
              <article className="portal-overview-card" key={view.id}>
                <div className="portal-overview-card-heading">
                  <span className="portal-glyph"><Rows3 size={17} /></span>
                  <div><h3>{view.label}</h3><p>{view.objectNamePlural}</p></div>
                  <Link aria-label={`Configure ${view.label}`} href={`/admin/views/${view.id}`}><ArrowRight size={16} /></Link>
                </div>
                <div className="portal-overview-metrics">
                  <span><Eye size={13} /><strong>{view.scopeMode === "records" ? view.allowedRecordIds.length : "All"}</strong> scope</span>
                  <span><Activity size={13} /><strong>{lastActivity ? "Recent" : "—"}</strong> activity</span>
                </div>
                <div className="portal-overview-actions">
                  <Link href={`/admin/views/${view.id}/preview`}>Preview <ArrowRight size={13} /></Link>
                  <Link href={`/admin/views/${view.id}`}>Configure</Link>
                </div>
              </article>
            );
          })}
        </div>
        {!activeViews.length ? (
          <div className="portal-home-empty">
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

      <section className="portal-home-section portal-activity-card">
        <div className="portal-home-section-heading">
          <div><p className="eyebrow">Live trail</p><h3>Recent portal activity</h3></div>
          <Link className="button secondary" href="/admin/audit">
            <FileClock size={16} />
            Full audit
          </Link>
        </div>
        <div className="portal-activity-list">
          {recentActivity.map((event) => (
            <div className="portal-activity-item" key={event.id}>
              <span className="activity-icon">
                <ActivityIcon action={event.action} />
              </span>
              <span className="portal-activity-copy">
                <strong>{activityLabel(event.action)}</strong>
                <span>
                  {event.userName ?? "Twenty webhook"}
                  {event.objectName ? ` · ${event.objectName}` : ""}
                  {event.status === "failure" ? " · Failed" : ""}
                </span>
              </span>
              <time>
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

      <section className="portal-home-section admin-metadata-section">
        <div className="portal-home-section-heading">
          <div>
            <p className="eyebrow">System</p>
            <h3>Twenty CRM metadata</h3>
            <span className="admin-metadata-synced-at">
              {latest
                ? `Last synchronized ${latest.syncedAt.toLocaleString()}`
                : "Metadata has not been synchronized."}
            </span>
          </div>
          <span>{latest ? `${latest.objects.length} objects` : "Not synchronized"}</span>
        </div>
        {latest?.objects.length ? (
          <div className="admin-metadata-list">
            {latest.objects.map((object) => (
              <div className="admin-metadata-object" key={object.id}>
                <span className="portal-glyph"><Database size={15} /></span>
                <div>
                  <strong>{object.labelPlural}</strong>
                  <span>{object.namePlural}</span>
                </div>
                <span>{object.fields.length} fields</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-metadata-empty">
            Synchronize metadata to display the available Twenty CRM objects.
          </p>
        )}
      </section>
      </div>
    </>
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
