import { createHmac, timingSafeEqual } from "node:crypto";

export function isFreshWebhookTimestamp(
  value: string,
  now = Date.now(),
  toleranceMs = 300_000,
) {
  const numeric = Number(value);
  const timestamp = Number.isFinite(numeric)
    ? numeric < 10_000_000_000
      ? numeric * 1000
      : numeric
    : Date.parse(value);
  return (
    Number.isFinite(timestamp) && Math.abs(now - timestamp) < toleranceMs
  );
}

export function verifyTwentyWebhookSignature(input: {
  timestamp: string;
  body: string;
  signature: string;
  secret: string;
}) {
  try {
    const expected = createHmac("sha256", input.secret)
      .update(`${input.timestamp}:${input.body}`)
      .digest();
    const actual = Buffer.from(input.signature, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
