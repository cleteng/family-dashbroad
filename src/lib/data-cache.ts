/**
 * Server-side in-memory data cache (TASK-022).
 *
 * Key conventions (no tokens in keys or logs):
 *   weather:{lat},{lon}     — Open-Meteo forecast (TTL 15m)
 *   geocode:{postal}         — postal → lat/lon (TTL 24h)
 *   gtasks:lists:{userId}   — Google task lists (TTL 5m)
 *   gtasks:tasks:{userId}:{listId} — incomplete tasks (TTL 5m)
 *
 * Concurrent getCached for the same key shares one in-flight Promise
 * so a stampede does not multiply upstream API calls.
 * Store is capped (MAX_CACHE_ENTRIES); oldest keys are dropped on insert.
 */

export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
export const GTASKS_CACHE_TTL_MS = 5 * 60 * 1000;
/** Postal/place geocoding (stable). */
export const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Soft cap on cache entries to bound memory on long-running processes. */
export const MAX_CACHE_ENTRIES = 5000;

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
const inFlight = new Map<string, Promise<CacheResult<unknown>>>();

function setEntry(key: string, entry: Entry<unknown>): void {
  // Refresh insertion order for eviction (Map iterates in insertion order)
  if (store.has(key)) store.delete(key);
  store.set(key, entry);
  while (store.size > MAX_CACHE_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

/**
 * getCached(key, fetcher, ttlMs)
 * - Fresh hit → return without calling fetcher
 * - Miss / expired → call fetcher (coalesced per key), store, return
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

  const pending = inFlight.get(key) as Promise<CacheResult<T>> | undefined;
  if (pending) return pending;

  const p: Promise<CacheResult<T>> = (async () => {
    try {
      const data = await fetcher();
      const fetchedAt = Date.now();
      setEntry(key, { data, fetchedAt });
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
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, p as Promise<CacheResult<unknown>>);
  return p;
}

/** Remove one key (e.g. after mutation). */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Remove all keys with a prefix (e.g. `gtasks:tasks:user:`).
 * Key count is expected to stay small (hundreds); full scan is fine.
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

/** Test helper. */
export function clearDataCache(): void {
  store.clear();
  inFlight.clear();
}

/** Test helper: seed an entry. */
export function seedDataCache<T>(
  key: string,
  data: T,
  fetchedAt: number,
): void {
  setEntry(key, { data, fetchedAt });
}

/** Test helper: read raw entry age. */
export function peekDataCache(key: string): { fetchedAt: number } | null {
  const e = store.get(key);
  return e ? { fetchedAt: e.fetchedAt } : null;
}

/** Test helper: current store size. */
export function dataCacheSize(): number {
  return store.size;
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
