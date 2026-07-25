import type { UseCaseDeps } from '../deps';

/**
 * Cache curto do orçamento diário de tokens (M4-09) — consultado a cada
 * mensagem do WhatsApp (`tokenBudget.isOverBudget`), então não pode bater
 * no Postgres toda vez. TTL curto o bastante pra sentir "sem redeploy";
 * `updateAiSettings` faz write-through nesta mesma chave, então uma
 * mudança pelo painel reflete na hora, sem esperar o TTL expirar.
 */
export const AI_BUDGET_CACHE_KEY = 'platform:ai-daily-token-budget';
export const AI_BUDGET_CACHE_TTL_SECONDS = 30;

export async function readDailyTokenBudget(
  deps: Pick<UseCaseDeps, 'repos' | 'cache'>
): Promise<number> {
  const cached = await deps.cache.get<number>(AI_BUDGET_CACHE_KEY);
  if (cached !== undefined) return cached;

  const settings = await deps.repos.aiSettings.get();
  await deps.cache.set(
    AI_BUDGET_CACHE_KEY,
    settings.dailyTokenBudgetPerUser,
    AI_BUDGET_CACHE_TTL_SECONDS
  );
  return settings.dailyTokenBudgetPerUser;
}
