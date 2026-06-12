import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  clientAccounts,
  memberships,
  portalAdministrators,
} from "@/lib/db/schema";

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

export async function requirePortalContext() {
  const current = await requireSession();
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

  if (!membership[0]) {
    if (await isAdministrator(current.user.id)) {
      redirect("/admin");
    }
    throw new Error("Your account is not linked to an active client.");
  }

  return {
    session: current,
    ...membership[0],
  };
}
