import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { portalViews, webhookReceipts } from "@/lib/db/schema";
import { getTwentyIntegrationSettings } from "@/lib/integration-settings";
import {
  isFreshWebhookTimestamp,
  verifyTwentyWebhookSignature,
} from "@/lib/twenty/webhook";

export async function POST(request: Request) {
  const timestamp = request.headers.get("x-twenty-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-twenty-webhook-signature") ?? "";
  const body = await request.text();
  const settings = await getTwentyIntegrationSettings();

  if (!isFreshWebhookTimestamp(timestamp)) {
    return NextResponse.json({ error: "Stale webhook" }, { status: 401 });
  }
  if (!settings.webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret is not configured" },
      { status: 503 },
    );
  }
  if (
    !verifyTwentyWebhookSignature({
      timestamp,
      body,
      signature,
      secret: settings.webhookSecret,
    })
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event: string;
    data?: Record<string, unknown>;
    timestamp?: string;
  };
  try {
    payload = JSON.parse(body) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload.event || typeof payload.event !== "string") {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  const fingerprint = createHash("sha256")
    .update(`${timestamp}:${body}`)
    .digest("hex");
  const inserted = await db
    .insert(webhookReceipts)
    .values({
      fingerprint,
      event: payload.event,
      recordId:
        typeof payload.data?.id === "string" ? payload.data.id : undefined,
    })
    .onConflictDoNothing()
    .returning({ id: webhookReceipts.id });
  if (!inserted.length) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const objectName = payload.event.split(".")[0];
  const views = await db.query.portalViews.findMany({
    where: eq(portalViews.objectNameSingular, objectName),
  });
  for (const view of views) {
    revalidatePath(`/portal/${view.slug}`);
  }
  await writeAuditEvent({
    action: payload.event,
    objectName,
    recordId:
      typeof payload.data?.id === "string" ? payload.data.id : undefined,
    status: "external",
    after: payload.data,
    metadata: { webhookTimestamp: payload.timestamp ?? timestamp },
  });

  return NextResponse.json({ received: true });
}
