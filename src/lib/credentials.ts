import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  account,
  invitations,
  memberships,
  portalAccess,
  portalAdministrators,
  user,
} from "@/lib/db/schema";
import { hashPortalPassword } from "@/lib/password";

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createCredentialUser(input: {
  name: string;
  email: string;
  password: string;
  isAdmin?: boolean;
  clientAccountId?: string | null;
  portalViewId?: string | null;
  membershipRole?: "viewer" | "contributor";
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await db.query.user.findFirst({
    where: eq(user.email, normalizedEmail),
  });

  if (existing) {
    throw new Error("An account already exists for this email address.");
  }

  const userId = randomUUID();
  const now = new Date();
  const passwordHash = await hashPortalPassword(input.password);

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name: input.name.trim(),
      email: normalizedEmail,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    if (input.isAdmin) {
      await tx.insert(portalAdministrators).values({ userId });
    }

    if (input.clientAccountId && input.membershipRole) {
      await tx.insert(memberships).values({
        userId,
        clientAccountId: input.clientAccountId,
        role: input.membershipRole,
      });
    }

    if (input.portalViewId && input.membershipRole) {
      await tx.insert(portalAccess).values({
        userId,
        portalViewId: input.portalViewId,
        role: input.membershipRole,
      });
    }
  });

  return userId;
}

export async function acceptInvitation(input: {
  token: string;
  password: string;
}) {
  const tokenHash = hashOpaqueToken(input.token);
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.tokenHash, tokenHash),
      eq(invitations.status, "pending"),
      gt(invitations.expiresAt, new Date()),
    ),
  });

  if (!invitation) {
    throw new Error("This invitation is invalid or has expired.");
  }

  const userId = await createCredentialUser({
    name: invitation.name,
    email: invitation.email,
    password: input.password,
    isAdmin: invitation.role === "admin",
    clientAccountId: invitation.clientAccountId,
    portalViewId: invitation.portalViewId,
    membershipRole:
      invitation.role === "viewer" || invitation.role === "contributor"
        ? invitation.role
        : undefined,
  });

  await db
    .update(invitations)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitation.id));

  return { userId, email: invitation.email };
}
