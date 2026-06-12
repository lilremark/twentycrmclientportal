import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  auditEvents,
  clientAccounts,
  user,
} from "@/lib/db/schema";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const conditions = [
    query.user ? ilike(user.email, `%${query.user}%`) : undefined,
    query.client ? ilike(clientAccounts.name, `%${query.client}%`) : undefined,
    query.action ? ilike(auditEvents.action, `%${query.action}%`) : undefined,
    query.object
      ? ilike(auditEvents.objectName, `%${query.object}%`)
      : undefined,
    query.record
      ? ilike(auditEvents.recordId, `%${query.record}%`)
      : undefined,
    query.status &&
    ["success", "failure", "external"].includes(query.status)
      ? eq(
          auditEvents.status,
          query.status as "success" | "failure" | "external",
        )
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
    <div className="grid gap-5">
      <form className="card grid gap-3 p-4 md:grid-cols-4">
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
          <select
            className="input"
            defaultValue={query.status ?? ""}
            id="status"
            name="status"
          >
            <option value="">Any</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="external">External</option>
          </select>
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
        <div className="flex items-end">
          <button className="button" type="submit">
            Search audit
          </button>
        </div>
      </form>
      <section className="card overflow-hidden">
        <div className="border-b border-[#dde3ed] p-5">
          <h2 className="text-lg font-bold">Audit events</h2>
          <p className="mt-1 text-sm text-[#68758a]">
            Up to 200 events matching the current search.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8f9fc] text-[#68758a]">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">User / client</th>
                <th className="p-4">Action</th>
                <th className="p-4">Object / record</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr className="border-t border-[#edf0f5]" key={event.id}>
                  <td className="p-4 whitespace-nowrap">
                    {event.createdAt.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="block">{event.userEmail ?? "System"}</span>
                    <span className="text-xs text-[#68758a]">
                      {event.clientName ?? "No client"}
                    </span>
                  </td>
                  <td className="p-4 font-semibold">{event.action}</td>
                  <td className="p-4">
                    <span className="block">{event.objectName ?? "—"}</span>
                    <span className="font-mono text-xs">
                      {event.recordId ?? "—"}
                    </span>
                  </td>
                  <td className="p-4 capitalize">{event.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
