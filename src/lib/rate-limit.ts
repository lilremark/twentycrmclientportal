import "server-only";

const writeBuckets = new Map<string, number[]>();

export function enforceWriteRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
) {
  const now = Date.now();
  const active = (writeBuckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );
  if (active.length >= limit) {
    throw new Error("Too many changes were submitted. Try again in a minute.");
  }
  active.push(now);
  writeBuckets.set(key, active);
}
