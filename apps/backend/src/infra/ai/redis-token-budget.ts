import { Redis } from "ioredis";
import type { TokenBudget } from "../../application/ports/token-budget";

/** Generoso o bastante pro uso diário normal, baixo o bastante pra travar um runaway de custo. */
export const DAILY_TOKEN_BUDGET_PER_USER = 100_000;

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function createRedisTokenBudget(redisUrl: string): TokenBudget {
  const redis = new Redis(redisUrl);
  const key = (userId: string) => `ai-tokens:${userId}:${todayIso()}`;

  return {
    async isOverBudget(userId) {
      const used = await redis.get(key(userId));
      return Number(used ?? 0) >= DAILY_TOKEN_BUDGET_PER_USER;
    },
    async recordUsage(userId, tokens) {
      const redisKey = key(userId);
      const total = await redis.incrby(redisKey, tokens);
      // Primeira escrita do dia — expira em ~25h (folga pro fuso), sem precisar zerar manualmente.
      if (total === tokens) await redis.expire(redisKey, 25 * 60 * 60);
    },
  };
}
