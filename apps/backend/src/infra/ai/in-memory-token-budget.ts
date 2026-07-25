import type { TokenBudget } from '../../application/ports/token-budget';

/** Mesmo valor padrão de `platform_settings` (M4-09) — só o bootstrap dos testes não passa por lá. */
const DEFAULT_TEST_BUDGET = 100_000;

/** Só para testes (`test/deps.ts`) — mesma ideia do `in-memory-rate-limiter.ts`. */
export function createInMemoryTokenBudget(): TokenBudget {
  const usedToday = new Map<string, number>();
  return {
    async isOverBudget(userId) {
      return (usedToday.get(userId) ?? 0) >= DEFAULT_TEST_BUDGET;
    },
    async recordUsage(userId, tokens) {
      usedToday.set(userId, (usedToday.get(userId) ?? 0) + tokens);
    },
  };
}
