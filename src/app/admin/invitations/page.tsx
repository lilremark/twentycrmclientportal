import { desc } from "drizzle-orm";

import { InvitationForm } from "@/components/admin-actions";
import { db } from "@/lib/db";
import {
  clientAccounts,
  invitations,
  portalViews,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function InvitationsPage() {
  const [views, clients, invites] = await Promise.all([
    db
      .select()
      .from(portalViews)
      .where(eq(portalViews.isEnabled, true)),
    db
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.isActive, true)),
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        portalLabel: portalViews.label,
        clientName: clientAccounts.name,
      })
      .from(invitations)
      .leftJoin(portalViews, eq(portalViews.id, invitations.portalViewId))
      .leftJoin(
        clientAccounts,
        eq(clientAccounts.id, invitations.clientAccountId),
      )
      .orderBy(desc(invitations.createdAt)),
  ]);
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Portal access</p>
          <h2>Invitations</h2>
          <p>
            Invite viewers and contributors, then monitor acceptance and expiry
            status.
          </p>
        </div>
      </div>
      <InvitationForm clients={clients} views={views} />
      <section className="card table-shell">
        <div className="section-heading">
          <h2 className="text-lg font-bold">Invitation history</h2>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Portal</th>
                <th>Client Person</th>
                <th>Status</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td className="capitalize">{invite.role}</td>
                  <td>{invite.portalLabel ?? "Administrator"}</td>
                  <td>{invite.clientName ?? "—"}</td>
                  <td className="capitalize">{invite.status}</td>
                  <td>{invite.expiresAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!invites.length ? (
          <div className="empty-state">No invitations have been created.</div>
        ) : null}
      </section>
    </div>
  );
}
