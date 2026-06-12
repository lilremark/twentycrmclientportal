import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

export type AuditInput = {
  actorUserId?: string | null;
  clientAccountId?: string | null;
  action: string;
  objectName?: string | null;
  recordId?: string | null;
  status: "success" | "failure" | "external";
  requestId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEvent(input: AuditInput) {
  await db.insert(auditEvents).values({
    actorUserId: input.actorUserId,
    clientAccountId: input.clientAccountId,
    action: input.action,
    objectName: input.objectName,
    recordId: input.recordId,
    status: input.status,
    requestId: input.requestId ?? randomUUID(),
    before: input.before,
    after: input.after,
    metadata: input.metadata ?? {},
  });
}
