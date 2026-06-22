import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearTwentyReadCache,
  getCachedTwentyRead,
} from "@/lib/twenty/cache";

beforeEach(() => {
  clearTwentyReadCache();
  vi.useRealTimers();
});

describe("Twenty read cache", () => {
  it("reuses a record while its TTL is active", async () => {
    const loader = vi.fn().mockResolvedValue({ id: "record-1" });

    await expect(getCachedTwentyRead("record-1", loader, 60_000)).resolves.toEqual({
      id: "record-1",
    });
    await expect(getCachedTwentyRead("record-1", loader, 60_000)).resolves.toEqual({
      id: "record-1",
    });

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("drops expired entries before loading again", async () => {
    vi.useFakeTimers();
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ version: 2 });

    await expect(getCachedTwentyRead("record-1", loader, 1_000)).resolves.toEqual({
      version: 1,
    });
    vi.advanceTimersByTime(1_001);
    await expect(getCachedTwentyRead("record-1", loader, 1_000)).resolves.toEqual({
      version: 2,
    });

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("evicts least-recently-used entries after the cache limit", async () => {
    const firstLoader = vi.fn().mockResolvedValue("first");
    await getCachedTwentyRead("entry-0", firstLoader, 60_000);

    for (let index = 1; index <= 500; index += 1) {
      await getCachedTwentyRead(`entry-${index}`, async () => index, 60_000);
    }

    await getCachedTwentyRead("entry-0", firstLoader, 60_000);
    expect(firstLoader).toHaveBeenCalledTimes(2);
  });
});
