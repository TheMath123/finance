import type { RateLimiter } from '../../application/ports/rate-limiter';

/**
 * Rate limiting em memória (janela deslizante) — só para testes (`test/deps.ts`),
 * onde não faz sentido depender de um Redis rodando. Em produção, ver
 * `redis-rate-limiter.ts` (M2: instância única deixou de ser premissa segura).
 */
export function createInMemoryRateLimiter(): RateLimiter {
  const buckets = new Map<string, number[]>();
  return {
    async isLimited(key, max, windowMs) {
      const now = Date.now();
      const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
      if (hits.length >= max) {
        buckets.set(key, hits);
        return true;
      }
      hits.push(now);
      buckets.set(key, hits);
      return false;
    },
  };
}
