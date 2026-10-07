/**
 * Unified server-side data cache (TASK-022).
 *
 * In-process memory only — never sent to the browser, never written to disk.
 * Tokens / credentials must never appear in cache keys or logs.
 *
 * Key convention:
 *   weather:{postalCode}  — Canadian postal, spaces stripped + uppercased
 *                           e.g. weather:J4L3B3
 *   gtasks:{listId}       — Google Tasks list id (not an OAuth token)
 *                           e.g. gtasks:MTIzNDU2Nzg5
 *
 * HA sensors (TASK-016/017/018) stay uncached — they need live values.
 */

export type CacheHit<T> = {
  data: T;
  /** Epoch ms when the data was last successfully fetched. */
  fetchedAt: number;
  /** True when this value is expired leftover because the fetcher failed. */
  stale: boolean;
};

type Entry<T> = {
  data: T;
  fetchedAt: number;
};

const store = new Map<string, Entry<unknown>>();

const DEFAULT_WEATHER_TTL_MS = 15 * 60 * 1000;
const DEFAULT_GTASKS_TTL_MS = 5 * 60 * 1000;

function readPositiveMs(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/** Weather TTL (default 15 min). Override with CACHE_TTL_WEATHER_MS. */
export function weatherTtlMs(): number {
  return readPositiveMs("CACHE_TTL_WEATHER_MS", DEFAULT_WEATHER_TTL_MS);
}

/** Google Tasks TTL (default 5 min). Override with CACHE_TTL_GTASKS_MS. */
export function gtasksTtlMs(): number {
  return readPositiveMs("CACHE_TTL_GTASKS_MS", DEFAULT_GTASKS_TTL_MS);
}

/** `weather:{postalCode}` — postal is normalized (no spaces, uppercase). */
export function weatherCacheKey(postalCode: string): string {
  const normalized = postalCode.replace(/\s+/g, "").toUpperCase();
  return `weather:${normalized}`;
}

/** `gtasks:{listId}` — list id only; never an access/refresh token. */
export function gtasksCacheKey(listId: string): string {
  return `gtasks:${listId}`;
}

/**
 * Return cached data when fresh; otherwise call `fetcher`, store, and return.
 * If `fetcher` throws and an older entry exists, return it with `stale: true`.
 * If `fetcher` throws and there is no entry, rethrow.
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): Promise<CacheHit<T>> {
  const now = Date.now();
  const existing = store.get(key) as Entry<T> | undefined;

  if (existing && now - existing.fetchedAt < ttlMs) {
    return {
      data: existing.data,
      fetchedAt: existing.fetchedAt,
      stale: false,
    };
  }

  try {
    const data = await fetcher();
    const fetchedAt = Date.now();
    store.set(key, { data, fetchedAt });
    return { data, fetchedAt, stale: false };
  } catch (err) {
    if (existing) {
      return {
        data: existing.data,
        fetchedAt: existing.fetchedAt,
        stale: true,
      };
    }
    throw err;
  }
}

/** Drop one key, or the whole store when `key` is omitted. */
export function clearCache(key?: string): void {
  if (key === undefined) {
    store.clear();
    return;
  }
  store.delete(key);
}

/** Remove a single key (mutations: complete/create task). */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/** Test helper: plant an entry as-of `fetchedAt`. */
export function seedCache<T>(key: string, data: T, fetchedAt: number): void {
  store.set(key, { data, fetchedAt });
}

/** Test helper: inspect an entry without affecting TTL. */
export function peekCache<T>(key: string): { data: T; fetchedAt: number } | undefined {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return undefined;
  return { data: entry.data, fetchedAt: entry.fetchedAt };
}
