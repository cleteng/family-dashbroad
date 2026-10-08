import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCached,
  clearDataCache,
  seedDataCache,
  invalidateCache,
  peekDataCache,
  weatherCacheKey,
  geocodeCacheKey,
  gtasksTasksCacheKey,
  GEOCODE_CACHE_TTL_MS,
} from "@/lib/data-cache";

describe("data-cache getCached", () => {
  beforeEach(() => {
    clearDataCache();
  });

  it("cache hit does not call fetcher", async () => {
    const fetcher = vi.fn(async () => "fresh");
    seedDataCache("k1", "cached", Date.now());
    const r = await getCached("k1", fetcher, 60_000);
    expect(r.data).toBe("cached");
    expect(r.stale).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("TTL expired calls fetcher again", async () => {
    seedDataCache("k1", "old", Date.now() - 120_000);
    const fetcher = vi.fn(async () => "new");
    const r = await getCached("k1", fetcher, 60_000);
    expect(r.data).toBe("new");
    expect(r.stale).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fetcher failure with old cache → stale data", async () => {
    seedDataCache("k1", "stale-data", Date.now() - 120_000);
    const fetcher = vi.fn(async () => {
      throw new Error("upstream down");
    });
    const r = await getCached("k1", fetcher, 60_000);
    expect(r.data).toBe("stale-data");
    expect(r.stale).toBe(true);
    expect(fetcher).toHaveBeenCalled();
  });

  it("fetcher failure without cache → throws", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("upstream down");
    });
    await expect(getCached("missing", fetcher, 60_000)).rejects.toThrow(
      "upstream down",
    );
  });

  it("different keys do not collide", async () => {
    seedDataCache("a", 1, Date.now());
    seedDataCache("b", 2, Date.now());
    const rA = await getCached("a", async () => 99, 60_000);
    const rB = await getCached("b", async () => 99, 60_000);
    expect(rA.data).toBe(1);
    expect(rB.data).toBe(2);
  });

  it("invalidate removes key", async () => {
    seedDataCache("k1", "x", Date.now());
    invalidateCache("k1");
    expect(peekDataCache("k1")).toBeNull();
    const fetcher = vi.fn(async () => "y");
    const r = await getCached("k1", fetcher, 60_000);
    expect(r.data).toBe("y");
    expect(fetcher).toHaveBeenCalled();
  });

  it("key helpers follow conventions", () => {
    expect(weatherCacheKey(45.5316, -73.5181)).toMatch(/^weather:/);
    expect(geocodeCacheKey("J4L3B3")).toBe("geocode:J4L3B3");
    expect(gtasksTasksCacheKey("u1", "L1")).toBe("gtasks:tasks:u1:L1");
    expect(GEOCODE_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
