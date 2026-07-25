import type { UseCaseDeps } from '../../deps';
import type { AiSettings } from '../../ports/ai-settings-repository';
import {
  AI_BUDGET_CACHE_KEY,
  AI_BUDGET_CACHE_TTL_SECONDS,
} from '../../services/ai-settings-cache';

/**
 * Write-through no cache do orçamento (mesma chave que `readDailyTokenBudget`
 * consulta) — assim a mudança reflete no pipeline de IA imediatamente, sem
 * esperar o TTL expirar (critério de conclusão do M4-09: "sem redeploy").
 */
export async function updateAiSettings(
  deps: Pick<UseCaseDeps, 'repos' | 'uow' | 'cache'>,
  adminUserId: string,
  patch: { dailyTokenBudgetPerUser: number }
): Promise<AiSettings> {
  const updated = await deps.uow.run(async (repos) => {
    const settings = await repos.aiSettings.update(patch);
    await repos.adminAudit.record({
      adminUserId,
      action: 'update_ai_settings',
      entity: 'platform_settings',
      entityId: settings.id,
      metadata: { dailyTokenBudgetPerUser: patch.dailyTokenBudgetPerUser },
    });
    return settings;
  });

  await deps.cache.set(
    AI_BUDGET_CACHE_KEY,
    updated.dailyTokenBudgetPerUser,
    AI_BUDGET_CACHE_TTL_SECONDS
  );

  return updated;
}
