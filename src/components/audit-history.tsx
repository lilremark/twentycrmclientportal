import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditEvents, clientAccounts, metadataSnapshots, user } from "@/lib/db/schema";
import { AppSelect } from "@/components/ui/app-select";

const supportedAuditActions = [
  "application.brand-logo.delete",
  "application.invitation-email.reset",
  "application.invitation-email.update",
  "application.login-background.delete",
  "application.settings.update",
  "attachment.created",
  "attachment.deleted",
  "client.activated",
  "client.created",
  "client.deleted",
  "client.suspended",
  "integration.smtp.update",
  "integration.sso.update",
  "integration.twenty.update",
  "invitation.accepted",
  "invitation.created",
  "invitation.deleted",
  "invitation.revoked",
  "metadata.synced",
  "note.created",
  "note.updated",
  "record.created",
  "record.updated",
  "setup.completed",
  "twenty.connection_tested",
  "user.activated",
  "user.deleted",
  "user.portal-access.granted",
  "user.portal-access.revoked",
  "user.suspended",
  "view.created",
  "view.deleted",
  "view.enabled",
  "view.suspended",
  "view.updated",
] as const;

function actionLabel(action: string) {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replaceAll("-", " "))
    .join(" · ");
}

export async function AuditHistory({
  query,
}: {
  query: Record<string, string | undefined>;
}) {
  const conditions = [
    query.user ? ilike(user.email, `%${query.user}%`) : undefined,
    query.client ? ilike(clientAccounts.name, `%${query.client}%`) : undefined,
    query.action ? eq(auditEvents.action, query.action) : undefined,
    query.object ? eq(auditEvents.objectName, query.object) : undefined,
    query.record ? ilike(auditEvents.recordId, `%${query.record}%`) : undefined,
    query.status && ["success", "failure", "external"].includes(query.status)
      ? eq(auditEvents.status, query.status as "success" | "failure" | "external")
      : undefined,
    query.from
      ? gte(auditEvents.createdAt, new Date(`${query.from}T00:00:00`))
      : undefined,
    query.to
      ? lte(auditEvents.createdAt, new Date(`${query.to}T23:59:59.999`))
      : undefined,
  ].filter((condition) => condition !== undefined);

  const [events, latest, recordedActions] = await Promise.all([
    db
      .select({
        id: auditEvents.id,
        createdAt: auditEvents.createdAt,
        action: auditEvents.action,
        objectName: auditEvents.objectName,
        recordId: auditEvents.recordId,
        status: auditEvents.status,
        userEmail: user.email,
        clientName: clientAccounts.name,
      })
      .from(auditEvents)
      .leftJoin(user, eq(user.id, auditEvents.actorUserId))
      .leftJoin(clientAccounts, eq(clientAccounts.id, auditEvents.clientAccountId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditEvents.createdAt))
      .limit(200),
    db
      .select()
      .from(metadataSnapshots)
      .orderBy(desc(metadataSnapshots.syncedAt))
      .limit(1)
      .then(([snapshot]) => snapshot),
    db.selectDistinct({ action: auditEvents.action }).from(auditEvents),
  ]);
  const actionOptions = [...new Set([
    ...supportedAuditActions,
    ...recordedActions.map((item) => item.action),
  ])].sort();
  const objectOptions = latest?.objects
    .map((object) => ({ label: object.labelSingular, value: object.nameSingular }))
    .sort((left, right) => left.label.localeCompare(right.label)) ?? [];

  return (
    <>
      <form className="card form-card md:grid-cols-4">
        {[
          ["user", "User email"],
          ["client", "Client"],
          ["record", "Record ID"],
        ].map(([name, label]) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              className="input"
              defaultValue={query[name] ?? ""}
              id={name}
              name={name}
            />
          </div>
        ))}
        <div className="field">
          <label htmlFor="action">Action</label>
          <AppSelect className="input" defaultValue={query.action ?? ""} id="action" name="action">
            <option value="">Any action</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{actionLabel(action)}</option>
            ))}
          </AppSelect>
        </div>
        <div className="field">
          <label htmlFor="object">Object</label>
          <AppSelect className="input" defaultValue={query.object ?? ""} id="object" name="object">
            <option value="">Any synced object</option>
            {objectOptions.map((object) => (
              <option key={object.value} value={object.value}>{object.label}</option>
            ))}
          </AppSelect>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <AppSelect
            className="input"
            defaultValue={query.status ?? ""}
            id="status"
            name="status"
          >
            <option value="">Any</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="external">External</option>
          </AppSelect>
        </div>
        <div className="field">
          <label htmlFor="from">From</label>
          <input
            className="input"
            defaultValue={query.from ?? ""}
            id="from"
            name="from"
            type="date"
          />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input
            className="input"
            defaultValue={query.to ?? ""}
            id="to"
            name="to"
            type="date"
          />
        </div>
        <div className="filter-actions">
          <button className="button" type="submit">
            Search audit
          </button>
        </div>
      </form>
      <section className="card table-shell">
        <div className="section-heading">
          <h2 className="text-lg font-bold">Audit events</h2>
          <p className="mt-1 text-sm text-[#68758a]">
            Up to 200 events matching the current search.
          </p>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User / client</th>
                <th>Action</th>
                <th>Object / record</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap">
                    {event.createdAt.toLocaleString()}
                  </td>
                  <td>
                    <span className="block">{event.userEmail ?? "System"}</span>
                    <span className="text-xs text-[#68758a]">
                      {event.clientName ?? "No client"}
                    </span>
                  </td>
                  <td className="font-semibold">{event.action}</td>
                  <td>
                    <span className="block">{event.objectName ?? "—"}</span>
                    <span className="font-mono text-xs">
                      {event.recordId ?? "—"}
                    </span>
                  </td>
                  <td className="capitalize">{event.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!events.length ? (
          <div className="empty-state">No audit events match this search.</div>
        ) : null}
      </section>
    </>
  );
}
