import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  clientAccounts,
  memberships,
  portalAccess,
  portalAdministrators,
} from "@/lib/db/schema";
import { getEnabledPortalViews } from "@/lib/portal";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const current = await getCurrentSession();
  if (!current) {
    redirect("/login");
  }
  return current;
}

export async function isAdministrator(userId: string) {
  const admin = await db.query.portalAdministrators.findFirst({
    where: eq(portalAdministrators.userId, userId),
  });
  return Boolean(admin);
}

export async function requireAdmin() {
  const current = await requireSession();
  if (!(await isAdministrator(current.user.id))) {
    redirect("/portal");
  }
  return current;
}

async function getPortalIdentity() {
  const current = await requireSession();
  const admin = await isAdministrator(current.user.id);
  const membership = await db
    .select({
      membershipId: memberships.id,
      role: memberships.role,
      clientAccountId: memberships.clientAccountId,
      clientName: clientAccounts.name,
      twentyCompanyId: clientAccounts.twentyCompanyId,
    })
    .from(memberships)
    .innerJoin(
      clientAccounts,
      and(
        eq(clientAccounts.id, memberships.clientAccountId),
        eq(clientAccounts.isActive, true),
      ),
    )
    .where(eq(memberships.userId, current.user.id))
    .limit(1);

  const views = await getEnabledPortalViews({
    userId: current.user.id,
    includeAll: admin,
    hasClientMembership: Boolean(membership[0]),
  });

  if (!membership[0] && !views.length) {
    if (admin) redirect("/admin");
    throw new Error("Your account is not linked to an active client.");
  }

  return {
    session: current,
    isAdmin: admin,
    membership: membership[0],
    views,
  };
}

export async function requirePortalContext() {
  const identity = await getPortalIdentity();
  return {
    ...identity,
    role: identity.membership?.role ?? "viewer",
    clientAccountId: identity.membership?.clientAccountId ?? null,
    clientName: identity.membership?.clientName ?? "Shared portal",
    twentyCompanyId: identity.membership?.twentyCompanyId ?? null,
  };
}

export async function requirePortalViewContext(slug: string) {
  const identity = await getPortalIdentity();
  const view = identity.views.find((item) => item.slug === slug);
  if (!view) redirect("/portal");

  const directGrant = await db.query.portalAccess.findFirst({
    where: and(
      eq(portalAccess.userId, identity.session.user.id),
      eq(portalAccess.portalViewId, view.id),
    ),
  });
  const role =
    directGrant?.role ??
    identity.membership?.role ??
    (identity.isAdmin ? "contributor" : "viewer");

  if (view.scopeMode === "company" && !identity.membership) {
    throw new Error(
      "This portal view requires a client Company membership. Configure it for specific records to share it directly.",
    );
  }

  return {
    session: identity.session,
    view,
    role,
    clientAccountId: identity.membership?.clientAccountId ?? null,
    clientName: identity.membership?.clientName ?? view.label,
    twentyCompanyId: identity.membership?.twentyCompanyId ?? null,
  };
}
