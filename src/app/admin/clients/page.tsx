import { createClientAccountAction } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { clientAccounts } from "@/lib/db/schema";

export default async function ClientsPage() {
  const clients = await db.select().from(clientAccounts);
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Access scope</p>
          <h2>Client accounts</h2>
          <p>
            Map each portal client to their Twenty Person record.
          </p>
        </div>
      </div>
      <form action={createClientAccountAction} className="card form-card">
        <div>
          <h2 className="text-base font-bold">Add client account</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Each Twenty Person can be mapped to one active portal client.
          </p>
        </div>
        <div className="form-grid two-column">
          <div className="field">
            <label htmlFor="name">Client name</label>
            <input className="input" id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="twentyPersonId">Twenty Person ID</label>
            <input
              className="input"
              id="twentyPersonId"
              name="twentyPersonId"
              placeholder="UUID from Twenty"
              required
            />
          </div>
        </div>
        <div className="form-actions">
          <button className="button" type="submit">
            Add client
          </button>
        </div>
      </form>
      <section className="card table-shell">
        <div className="section-heading">
          <h2 className="text-lg font-bold">Client accounts</h2>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Twenty Person ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="font-semibold">{client.name}</td>
                  <td className="font-mono text-xs">
                    {client.twentyPersonId}
                  </td>
                  <td>
                    <span className="badge">
                      {client.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!clients.length ? (
          <div className="empty-state">No client accounts configured.</div>
        ) : null}
      </section>
    </div>
  );
}
