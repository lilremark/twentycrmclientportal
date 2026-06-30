import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditEvents, clientAccounts, user } from "@/lib/db/schema";
import { AppSelect } from "@/components/ui/app-select";

export async function AuditHistory({
  query,
}: {
  query: Record<string, string | undefined>;
}) {
  const conditions = [
    query.user ? ilike(user.email, `%${query.user}%`) : undefined,
    query.client ? ilike(clientAccounts.name, `%${query.client}%`) : undefined,
    query.action ? ilike(auditEvents.action, `%${query.action}%`) : undefined,
    query.object ? ilike(auditEvents.objectName, `%${query.object}%`) : undefined,
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

  const events = await db
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
    .limit(200);

  return (
    <>
      <form className="card form-card md:grid-cols-4">
        {[
          ["user", "User email"],
          ["client", "Client"],
          ["action", "Action"],
          ["object", "Object"],
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
