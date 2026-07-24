import { Redis } from 'ioredis';
import type { RateLimiter } from '../../application/ports/rate-limiter';

/**
 * Rate limiting via Redis — janela deslizante com sorted set (ZADD + ZREMRANGEBYSCORE
 * + ZCARD numa única chamada atômica via `multi`), migrado do M1 em memória (spec:
 * Rate limiting — M2 migra para Redis, mesma interface `RateLimiter`).
 * Cada membro do set é único (timestamp + valor aleatório) para não colidir quando
 * duas requisições chegam no mesmo milissegundo.
 */
export function createRedisRateLimiter(redisUrl: string): RateLimiter {
  const redis = new Redis(redisUrl);

  return {
    async isLimited(key, max, windowMs) {
      const redisKey = `ratelimit:${key}`;
      const now = Date.now();
      const windowStart = now - windowMs;
      const member = `${now}:${Math.random()}`;

      const results = await redis
        .multi()
        .zremrangebyscore(redisKey, 0, windowStart)
        .zadd(redisKey, now, member)
        .zcard(redisKey)
        .pexpire(redisKey, windowMs)
        .exec();

      const count = (results?.[2]?.[1] as number) ?? 0;
      return count > max;
    },
  };
}
