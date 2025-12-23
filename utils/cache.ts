const cache = new Map<string, {
  data: unknown;
  timestamp: number;
  ttlMs: number;
  promise?: Promise<unknown>;
}>();

function isEntryFresh(entry: { timestamp: number; ttlMs: number }) {
  return Date.now() - entry.timestamp < entry.ttlMs;
}

export function getCachedValue<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (!isEntryFresh(entry)) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? 60_000;
  const existing = cache.get(key);

  if (existing) {
    if (existing.promise) {
      return existing.promise.then((value) => value as T);
    }
    if (isEntryFresh(existing)) {
      return existing.data as T;
    }
    cache.delete(key);
  }

  const promise = (async () => {
    try {
      const result = await fetcher();
      cache.set(key, { data: result as unknown, timestamp: Date.now(), ttlMs });
      return result;
    } catch (err) {
      cache.delete(key);
      throw err;
    }
  })();

  cache.set(key, { data: undefined, timestamp: Date.now(), ttlMs, promise });

  return promise;
}

export function invalidateCache(key?: string) {
  if (!key) {
    cache.clear();
    return;
  }
  cache.delete(key);
}
