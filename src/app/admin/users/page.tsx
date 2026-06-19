import { desc, eq } from "drizzle-orm";

import {
  deleteUserAction,
  grantUserPortalAccessAction,
  revokeUserPortalAccessAction,
  setUserStatusAction,
} from "@/app/actions/admin";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { requireAdmin } from "@/lib/access";
import { db } from "@/lib/db";
import {
  clientAccounts,
  memberships,
  portalAccess,
  portalAdministrators,
  portalViews,
  user,
} from "@/lib/db/schema";

export default async function UserManagementPage() {
  const current = await requireAdmin();
  const [users, admins, clientMemberships, directAccess, availableViews] =
    await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt)),
    db.select().from(portalAdministrators),
    db
      .select({
        userId: memberships.userId,
        role: memberships.role,
        clientName: clientAccounts.name,
      })
      .from(memberships)
      .innerJoin(
        clientAccounts,
        eq(clientAccounts.id, memberships.clientAccountId),
      ),
    db
      .select({
        userId: portalAccess.userId,
        portalViewId: portalAccess.portalViewId,
        role: portalAccess.role,
        portalLabel: portalViews.label,
      })
      .from(portalAccess)
      .innerJoin(portalViews, eq(portalViews.id, portalAccess.portalViewId)),
    db
      .select({
        id: portalViews.id,
        label: portalViews.label,
      })
      .from(portalViews)
      .where(eq(portalViews.isEnabled, true))
      .orderBy(portalViews.navigationOrder, portalViews.label),
  ]);
  const adminUserIds = new Set(admins.map((admin) => admin.userId));
  const membershipsByUser = new Map<string, typeof clientMemberships>();
  const accessByUser = new Map<string, typeof directAccess>();

  for (const membership of clientMemberships) {
    membershipsByUser.set(membership.userId, [
      ...(membershipsByUser.get(membership.userId) ?? []),
      membership,
    ]);
  }
  for (const access of directAccess) {
    accessByUser.set(access.userId, [
      ...(accessByUser.get(access.userId) ?? []),
      access,
    ]);
  }

  return (
    <div className="page-stack">
      <section className="card table-shell">
        <div className="section-heading">
          <h2 className="text-lg font-bold">Users</h2>
          <p className="mt-1 text-sm text-[#68758a]">
            Suspending a user immediately revokes active sessions.
          </p>
        </div>
        <div className="table-scroll">
          <table className="data-table users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Portal access</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => {
                const isSelf = item.id === current.user.id;
                const userMemberships = membershipsByUser.get(item.id) ?? [];
                const userAccess = accessByUser.get(item.id) ?? [];
                return (
                  <tr key={item.id}>
                    <td>
                      <span className="block font-semibold">{item.name}</span>
                      <span className="text-xs text-[#68758a]">
                        {item.email}
                      </span>
                    </td>
                    <td>
                      {adminUserIds.has(item.id) ? (
                        <span className="badge">Administrator</span>
                      ) : (
                        <span className="badge">Portal user</span>
                      )}
                    </td>
                    <td>
                      <div className="stacked-meta">
                        {userMemberships.map((membership) => (
                          <span key={`${membership.clientName}-${membership.role}`}>
                            {membership.clientName} · {membership.role}
                          </span>
                        ))}
                        {userAccess.map((access) => (
                          <span
                            className="user-access-grant"
                            key={access.portalViewId}
                          >
                            <span>
                              {access.portalLabel} · {access.role}
                            </span>
                            <form
                              action={revokeUserPortalAccessAction.bind(
                                null,
                                item.id,
                                access.portalViewId,
                              )}
                            >
                              <button
                                aria-label={`Revoke access to ${access.portalLabel}`}
                                className="access-revoke-button"
                                type="submit"
                              >
                                Revoke
                              </button>
                            </form>
                          </span>
                        ))}
                        {!userMemberships.length && !userAccess.length ? (
                          <span>No portal access</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className="badge">
                        {item.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td>{item.createdAt.toLocaleDateString()}</td>
                    <td>
                      <div className="user-management-actions">
                        <form
                          action={grantUserPortalAccessAction.bind(
                            null,
                            item.id,
                          )}
                          className="portal-access-form"
                        >
                          <select
                            aria-label={`Portal for ${item.name}`}
                            className="input"
                            name="portalViewId"
                            required
                          >
                            <option value="">Assign portal…</option>
                            {availableViews.map((view) => (
                              <option key={view.id} value={view.id}>
                                {view.label}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label={`Portal role for ${item.name}`}
                            className="input"
                            defaultValue="viewer"
                            name="role"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="contributor">Contributor</option>
                          </select>
                          <button className="button secondary" type="submit">
                            Assign
                          </button>
                        </form>
                        <div className="table-actions">
                        <form
                          action={setUserStatusAction.bind(
                            null,
                            item.id,
                            !item.isActive,
                          )}
                        >
                          <button
                            className="button secondary"
                            disabled={isSelf}
                            type="submit"
                          >
                            {item.isActive ? "Suspend" : "Reactivate"}
                          </button>
                        </form>
                        <ConfirmDeleteForm
                          action={deleteUserAction.bind(null, item.id)}
                          description={`This permanently deletes ${item.email}, removes their sessions, access grants, memberships, and invitations they created.`}
                          disabled={isSelf}
                          title={`Delete ${item.name}?`}
                        />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!users.length ? <div className="empty-state">No users found.</div> : null}
      </section>
    </div>
  );
}
