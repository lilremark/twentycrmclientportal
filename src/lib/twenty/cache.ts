import "server-only";

import { createHash } from "node:crypto";

const DEFAULT_TTL_MS = 20_000;
export const RECORD_CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 500;

type ReadCacheEntry<T> = {
  expiresAt: number;
  promise?: Promise<T>;
  value?: T;
};

type TwentyReadCacheGlobal = typeof globalThis & {
  __twentyReadCache?: Map<string, ReadCacheEntry<unknown>>;
};

const globalCache = globalThis as TwentyReadCacheGlobal;
const readCache = globalCache.__twentyReadCache ?? new Map();
globalCache.__twentyReadCache = readCache;

export function twentyReadCacheKey(endpoint: string, query: string) {
  return createHash("sha256").update(`${endpoint}:${query}`).digest("hex");
}

export function clearTwentyReadCache() {
  readCache.clear();
}

export async function getCachedTwentyRead<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const cached = readCache.get(key) as ReadCacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    readCache.delete(key);
    readCache.set(key, cached);
    if (cached.value !== undefined) return cached.value;
    if (cached.promise) return cached.promise;
  }
  if (cached) readCache.delete(key);

  const promise = loader()
    .then((value) => {
      readCache.set(key, {
        expiresAt: Date.now() + ttlMs,
        value,
      });
      trimTwentyReadCache();
      return value;
    })
    .catch((error) => {
      const current = readCache.get(key);
      if (current?.promise === promise) readCache.delete(key);
      throw error;
    });

  readCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  });
  trimTwentyReadCache();

  return promise;
}

function trimTwentyReadCache() {
  const now = Date.now();
  for (const [key, entry] of readCache) {
    if (entry.expiresAt <= now) readCache.delete(key);
  }
  while (readCache.size > MAX_CACHE_ENTRIES) {
    const [firstKey] = readCache.keys();
    if (!firstKey) return;
    readCache.delete(firstKey);
  }
}
