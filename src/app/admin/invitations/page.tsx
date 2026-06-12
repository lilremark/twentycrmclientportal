import { desc } from "drizzle-orm";

import { InvitationForm } from "@/components/admin-actions";
import { db } from "@/lib/db";
import { invitations, portalViews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function InvitationsPage() {
  const [views, invites] = await Promise.all([
    db
      .select()
      .from(portalViews)
      .where(eq(portalViews.scopeMode, "records")),
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        portalLabel: portalViews.label,
      })
      .from(invitations)
      .leftJoin(portalViews, eq(portalViews.id, invitations.portalViewId))
      .orderBy(desc(invitations.createdAt)),
  ]);
  return (
    <div className="grid gap-6">
      <InvitationForm views={views} />
      <section className="card overflow-hidden">
        <div className="border-b border-[#dde3ed] p-5">
          <h2 className="text-lg font-bold">Invitation history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8f9fc] text-[#68758a]">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Portal</th>
                <th className="p-4">Status</th>
                <th className="p-4">Expires</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr className="border-t border-[#edf0f5]" key={invite.id}>
                  <td className="p-4">{invite.email}</td>
                  <td className="p-4 capitalize">{invite.role}</td>
                  <td className="p-4">{invite.portalLabel ?? "Administrator"}</td>
                  <td className="p-4 capitalize">{invite.status}</td>
                  <td className="p-4">{invite.expiresAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
