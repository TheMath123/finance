import type { Cache } from '../../application/ports/cache';

/** Test double do Cache (Redis) — mesmo padrão de infra/ai/in-memory-token-budget.ts. */
export function createInMemoryCache(): Cache {
  const store = new Map<string, { value: unknown; expiresAt: number }>();

  return {
    async get<T>(key: string) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value as T;
    },
    async set<T>(key: string, value: T, ttlSeconds: number) {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
  };
}
