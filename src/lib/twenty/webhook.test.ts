import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  isFreshWebhookTimestamp,
  verifyTwentyWebhookSignature,
} from "@/lib/twenty/webhook";

describe("Twenty webhook verification", () => {
  it("validates an HMAC over the exact raw body", () => {
    const timestamp = "1710000000";
    const body = '{"event":"company.updated"}';
    const secret = "test-secret";
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}:${body}`)
      .digest("hex");
    expect(
      verifyTwentyWebhookSignature({
        timestamp,
        body,
        secret,
        signature,
      }),
    ).toBe(true);
    expect(
      verifyTwentyWebhookSignature({
        timestamp,
        body: `${body}\n`,
        secret,
        signature,
      }),
    ).toBe(false);
  });

  it("rejects timestamps outside the replay window", () => {
    expect(isFreshWebhookTimestamp("1710000000", 1710000000 * 1000)).toBe(true);
    expect(
      isFreshWebhookTimestamp("1710000000", 1710000000 * 1000 + 301_000),
    ).toBe(false);
  });
});
