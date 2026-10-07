import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCache,
  getCached,
  gtasksCacheKey,
  peekCache,
  seedCache,
  weatherCacheKey,
} from "@/lib/cache";

describe("cache keys", () => {
  it("normalizes weather postal codes", () => {
    expect(weatherCacheKey("J4L 3B3")).toBe("weather:J4L3B3");
    expect(weatherCacheKey("j4l3b3")).toBe("weather:J4L3B3");
    expect(weatherCacheKey("  J4L  3B3 ")).toBe("weather:J4L3B3");
  });

  it("builds gtasks keys from list id only", () => {
    expect(gtasksCacheKey("LIST1")).toBe("gtasks:LIST1");
  });

  it("never puts tokens in keys", () => {
    const weather = weatherCacheKey("J4L 3B3");
    const tasks = gtasksCacheKey("MTIzNDU");
    const blob = `${weather}\n${tasks}`;
    expect(blob).not.toMatch(/access_token|refresh_token|Bearer|ya29\./i);
  });
});

describe("getCached", () => {
  beforeEach(() => {
    clearCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    clearCache();
  });

  it("returns cached data without calling fetcher on a fresh hit", async () => {
    const fetcher = vi.fn().mockResolvedValue({ n: 1 });
    const first = await getCached("weather:J4L3B3", fetcher, 15 * 60 * 1000);
    expect(first).toEqual({
      data: { n: 1 },
      fetchedAt: Date.now(),
      stale: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    fetcher.mockResolvedValue({ n: 99 });
    const second = await getCached("weather:J4L3B3", fetcher, 15 * 60 * 1000);
    expect(second.data).toEqual({ n: 1 });
    expect(second.stale).toBe(false);
    expect(second.fetchedAt).toBe(first.fetchedAt);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("calls fetcher again after TTL expires", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("fresh").mockResolvedValueOnce("refreshed");
    const ttl = 5 * 60 * 1000;

    const first = await getCached("gtasks:L1", fetcher, ttl);
    expect(first.data).toBe("fresh");

    vi.advanceTimersByTime(ttl - 1);
    const stillFresh = await getCached("gtasks:L1", fetcher, ttl);
    expect(stillFresh.data).toBe("fresh");
    expect(fetcher).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    const refreshed = await getCached("gtasks:L1", fetcher, ttl);
    expect(refreshed.data).toBe("refreshed");
    expect(refreshed.stale).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns old data with stale=true when fetcher fails and cache exists", async () => {
    const ttl = 60_000;
    seedCache("weather:H2X1Y4", { temp: 12 }, Date.now() - ttl * 2);
    const fetcher = vi.fn().mockRejectedValue(new Error("api down"));

    const hit = await getCached("weather:H2X1Y4", fetcher, ttl);
    expect(hit.data).toEqual({ temp: 12 });
    expect(hit.stale).toBe(true);
    expect(hit.fetchedAt).toBe(Date.now() - ttl * 2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("throws when fetcher fails and there is no cache", async () => {
    const err = new Error("api down");
    const fetcher = vi.fn().mockRejectedValue(err);
    await expect(getCached("weather:Z9Z9Z9", fetcher, 1000)).rejects.toBe(err);
    expect(peekCache("weather:Z9Z9Z9")).toBeUndefined();
  });

  it("keeps different keys isolated", async () => {
    const a = vi.fn().mockResolvedValue("weather-a");
    const b = vi.fn().mockResolvedValue("tasks-b");
    const weather = await getCached(weatherCacheKey("J4L 3B3"), a, 60_000);
    const tasks = await getCached(gtasksCacheKey("LIST1"), b, 60_000);
    expect(weather.data).toBe("weather-a");
    expect(tasks.data).toBe("tasks-b");

    a.mockResolvedValue("weather-a-new");
    b.mockResolvedValue("tasks-b-new");
    expect((await getCached(weatherCacheKey("J4L 3B3"), a, 60_000)).data).toBe("weather-a");
    expect((await getCached(gtasksCacheKey("LIST1"), b, 60_000)).data).toBe("tasks-b");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    const otherPostal = vi.fn().mockResolvedValue("weather-other");
    const other = await getCached(weatherCacheKey("H2X 1Y4"), otherPostal, 60_000);
    expect(other.data).toBe("weather-other");
    expect(otherPostal).toHaveBeenCalledTimes(1);
    expect((await getCached(weatherCacheKey("J4L 3B3"), a, 60_000)).data).toBe("weather-a");
  });
});
