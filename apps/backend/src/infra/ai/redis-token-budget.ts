import { Redis } from 'ioredis';
import type { TokenBudget } from '../../application/ports/token-budget';

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * `getDailyBudget` vem de `readDailyTokenBudget` (application/services) —
 * lido de `platform_settings` (M4-09, editável pelo superadmin) com cache
 * curto, em vez do valor fixo que existia aqui antes.
 */
export function createRedisTokenBudget(
  redisUrl: string,
  getDailyBudget: () => Promise<number>
): TokenBudget {
  const redis = new Redis(redisUrl);
  const key = (userId: string) => `ai-tokens:${userId}:${todayIso()}`;

  return {
    async isOverBudget(userId) {
      const [used, budget] = await Promise.all([
        redis.get(key(userId)),
        getDailyBudget(),
      ]);
      return Number(used ?? 0) >= budget;
    },
    async recordUsage(userId, tokens) {
      const redisKey = key(userId);
      const total = await redis.incrby(redisKey, tokens);
      // Primeira escrita do dia — expira em ~25h (folga pro fuso), sem precisar zerar manualmente.
      if (total === tokens) await redis.expire(redisKey, 25 * 60 * 60);
    },
  };
}
