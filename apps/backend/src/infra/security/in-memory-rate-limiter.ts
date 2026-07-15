import type { RateLimiter } from "../../application/ports/rate-limiter";

/**
 * Rate limiting em memória (janela deslizante) — instância única do M1.
 * No M2 migra para Redis atrás desta mesma interface (spec: Rate limiting).
 */
export function createInMemoryRateLimiter(): RateLimiter {
  const buckets = new Map<string, number[]>();
  return {
    isLimited(key, max, windowMs) {
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
