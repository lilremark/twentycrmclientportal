import {
  createClientAccountAction,
  deleteClientAccountAction,
  setClientAccountStatusAction,
} from "@/app/actions/admin";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { db } from "@/lib/db";
import { clientAccounts } from "@/lib/db/schema";

export default async function InvitationClientsPage() {
  const clients = await db.select().from(clientAccounts);
  return (
    <div className="page-stack">
      <form action={createClientAccountAction} className="card form-card">
        <div>
          <h2 className="text-base font-bold">Add client account</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Person mappings are optional for general portal invitations and
            required only for Person-scoped portal views.
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
          <p className="mt-1 text-sm text-[#68758a]">
            Suspended clients cannot be used for Person-scoped portal access.
          </p>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Twenty Person ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="font-semibold">{client.name}</td>
                  <td className="font-mono text-xs">{client.twentyPersonId}</td>
                  <td>
                    <span className="badge">
                      {client.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <form
                        action={setClientAccountStatusAction.bind(
                          null,
                          client.id,
                          !client.isActive,
                        )}
                      >
                        <button className="button secondary" type="submit">
                          {client.isActive ? "Suspend" : "Reactivate"}
                        </button>
                      </form>
                      <ConfirmDeleteForm
                        action={deleteClientAccountAction.bind(null, client.id)}
                        description={`This permanently deletes ${client.name} and removes related portal memberships and pending invitations.`}
                        title={`Delete ${client.name}?`}
                      />
                    </div>
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
