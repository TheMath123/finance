import { type Either, left, right } from '@finance/shared';
import type { Workspace } from '../../../domain/entities/workspace';
import type { UseCaseDeps } from '../../deps';
import type { AdminError } from './errors';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Controle manual do plano de um workspace pelo superadmin (M5-02) — hoje é
 * a única forma de mudar plano fora do fluxo de cobrança (que ainda não
 * existe). M5-03: também aceita escolher a opção de cobrança (`planPriceId`,
 * se omitido usa a marcada `isDefault` do plano) e, ao trocar de plano pra
 * um com `trialDays > 0`, inicia um novo trial (`trialEndsAt`); trocar pra um
 * plano sem trial, ou reatribuir o mesmo plano, não mexe no trial atual.
 */
export async function setWorkspacePlan(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  workspaceId: string,
  planId: string,
  planPriceId?: string
): Promise<Either<AdminError, Workspace>> {
  const workspace = await deps.repos.workspace.findById(workspaceId);
  if (!workspace) return left('workspace_not_found');

  const plan = await deps.repos.plan.findById(planId);
  if (!plan) return left('plan_not_found');

  let resolvedPriceId: string | null = null;
  if (planPriceId) {
    const price = await deps.repos.plan.findPriceById(planPriceId);
    if (!price || price.planId !== planId) return left('plan_price_not_found');
    resolvedPriceId = price.id;
  } else {
    const defaultPrice = plan.prices.find((p) => p.isDefault) ?? plan.prices[0];
    resolvedPriceId = defaultPrice?.id ?? null;
  }

  const isPlanChange = workspace.planId !== planId;
  const trialEndsAt = isPlanChange
    ? plan.trialDays > 0
      ? new Date(Date.now() + plan.trialDays * DAY_MS)
      : null
    : workspace.trialEndsAt;

  const updated = await deps.uow.run(async (repos) => {
    const result = await repos.workspace.updatePlan(workspaceId, {
      planId,
      planPriceId: resolvedPriceId,
      trialEndsAt,
    });
    await repos.adminAudit.record({
      adminUserId,
      action: 'set_workspace_plan',
      entity: 'workspace',
      entityId: workspaceId,
      metadata: {
        fromPlanId: workspace.planId,
        toPlanId: planId,
        planPriceId: resolvedPriceId,
      },
    });
    return result;
  });

  return right(updated);
}
