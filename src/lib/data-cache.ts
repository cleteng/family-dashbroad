/**
 * Server-side in-memory data cache (TASK-022).
 *
 * Key conventions (no tokens in keys or logs):
 *   weather:{lat},{lon}     — Open-Meteo forecast (TTL 15m)
 *   geocode:{postal}         — postal → lat/lon (TTL 24h)
 *   gtasks:lists:{userId}   — Google task lists (TTL 5m)
 *   gtasks:tasks:{userId}:{listId} — incomplete tasks (TTL 5m)
 */

export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
export const GTASKS_CACHE_TTL_MS = 5 * 60 * 1000;
/** Postal/place geocoding (stable). */
export const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type CacheResult<T> = {
  data: T;
  /** Epoch ms when data was last successfully fetched from upstream. */
  fetchedAt: number;
  /** true when serving expired entry because fetcher failed. */
  stale: boolean;
};

type Entry<T> = {
  data: T;
  fetchedAt: number;
};

const store = new Map<string, Entry<unknown>>();

/**
 * getCached(key, fetcher, ttlMs)
 * - Fresh hit → return without calling fetcher
 * - Miss / expired → call fetcher, store, return
 * - Fetcher throws + old entry → return stale data
 * - Fetcher throws + no entry → rethrow
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): Promise<CacheResult<T>> {
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

/** Remove one key (e.g. after mutation). */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/** Remove all keys with a prefix (e.g. `gtasks:tasks:user:`). */
export function invalidateCachePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

/** Test helper. */
export function clearDataCache(): void {
  store.clear();
}

/** Test helper: seed an entry. */
export function seedDataCache<T>(
  key: string,
  data: T,
  fetchedAt: number,
): void {
  store.set(key, { data, fetchedAt });
}

/** Test helper: read raw entry age. */
export function peekDataCache(key: string): { fetchedAt: number } | null {
  const e = store.get(key);
  return e ? { fetchedAt: e.fetchedAt } : null;
}

export function weatherCacheKey(lat: number, lon: number): string {
  return `weather:${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/** Normalized postal/place string → geocode cache key. */
export function geocodeCacheKey(normalizedPostal: string): string {
  return `geocode:${normalizedPostal}`;
}

export function gtasksListsCacheKey(userId: string): string {
  return `gtasks:lists:${userId}`;
}

export function gtasksTasksCacheKey(userId: string, listId: string): string {
  return `gtasks:tasks:${userId}:${listId}`;
}
