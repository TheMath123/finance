import type { TokenBudget } from "../../application/ports/token-budget";
import { DAILY_TOKEN_BUDGET_PER_USER } from "./redis-token-budget";

/** Só para testes (`test/deps.ts`) — mesma ideia do `in-memory-rate-limiter.ts`. */
export function createInMemoryTokenBudget(): TokenBudget {
  const usedToday = new Map<string, number>();
  return {
    async isOverBudget(userId) {
      return (usedToday.get(userId) ?? 0) >= DAILY_TOKEN_BUDGET_PER_USER;
    },
    async recordUsage(userId, tokens) {
      usedToday.set(userId, (usedToday.get(userId) ?? 0) + tokens);
    },
  };
}
