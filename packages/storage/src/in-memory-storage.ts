import type { Storage } from "./storage";

/** Test double do Storage (S3/R2) — mesmo padrão de infra/cache/infra/ai. */
export function createInMemoryStorage(): Storage {
  const store = new Map<string, { body: Uint8Array; contentType: string }>();

  return {
    async upload(key, body, contentType) {
      store.set(key, { body, contentType });
    },
    async getSignedReadUrl(key, ttlSeconds) {
      if (!store.has(key)) throw new Error(`chave não encontrada: ${key}`);
      return `memory://${key}?ttl=${ttlSeconds}`;
    },
    async delete(key) {
      store.delete(key);
    },
  };
}
