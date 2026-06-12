"use server";

import { timingSafeEqual } from "node:crypto";

import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAuditEvent } from "@/lib/audit";
import { acceptInvitation, createCredentialUser } from "@/lib/credentials";
import { db } from "@/lib/db";
import { portalAdministrators } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";

const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export type AuthActionState = { error?: string };

function safeTokenEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function setupAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(portalAdministrators);
    if (adminCount > 0) {
      return { error: "Initial setup has already been completed." };
    }

    const input = z
      .object({
        setupToken: z.string(),
        name: z.string().trim().min(2),
        email: z.email(),
        password: passwordSchema,
      })
      .parse(Object.fromEntries(formData));

    if (!safeTokenEqual(input.setupToken, getEnv().SETUP_TOKEN)) {
      return { error: "The setup token is invalid." };
    }

    const userId = await createCredentialUser({
      name: input.name,
      email: input.email,
      password: input.password,
      isAdmin: true,
    });
    await writeAuditEvent({
      actorUserId: userId,
      action: "setup.completed",
      status: "success",
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Setup failed.",
    };
  }

  redirect("/login?setup=complete");
}

export async function acceptInvitationAction(
  token: string,
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const password = passwordSchema.parse(formData.get("password"));
    const userId = await acceptInvitation({ token, password });
    await writeAuditEvent({
      actorUserId: userId,
      action: "invitation.accepted",
      status: "success",
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Invitation acceptance failed.",
    };
  }

  redirect("/login?invitation=accepted");
}
