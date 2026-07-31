/**
 * Tiny in-memory TTL cache.
 *
 * Used to avoid repeat Google Routes calls for the same origin/destination pair
 * and to avoid re-reading the settings row on every request. It is per-instance,
 * which is the right trade-off for a single Vercel region on a free tier; swap
 * the implementation for Redis/Upstash if you scale to many instances.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private store = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh recency for the naive LRU eviction below.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Caches survive Next.js hot reloads by living on globalThis in development.
 */
export function createSharedCache<T>(
  name: string,
  ttlMs: number,
  maxEntries?: number,
): TtlCache<T> {
  const globalForCache = globalThis as unknown as Record<string, TtlCache<T> | undefined>;
  const key = `__tfe_cache_${name}`;
  const existing = globalForCache[key];
  if (existing) return existing;

  const cache = new TtlCache<T>(ttlMs, maxEntries);
  globalForCache[key] = cache;
  return cache;
}
