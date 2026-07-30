import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { Plan } from '../../ports/plan-repository';
import type { AdminError } from './errors';

/**
 * Sem hard delete — `plans.id` é referenciado por `workspaces.planId` (FK).
 * Desativar só tira o plano da lista de opções pra novas atribuições; quem
 * já está nele continua exatamente como antes (limites/preço intactos).
 */
async function setPlanActive(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  id: string,
  isActive: boolean
): Promise<Either<AdminError, Plan>> {
  const existing = await deps.repos.plan.findById(id);
  if (!existing) return left('plan_not_found');

  const updated = await deps.uow.run(async (repos) => {
    const plan = await repos.plan.setActive(id, isActive);
    await repos.adminAudit.record({
      adminUserId,
      action: isActive ? 'activate_plan' : 'deactivate_plan',
      entity: 'plan',
      entityId: plan.id,
    });
    return plan;
  });

  return right(updated);
}

export const deactivatePlan = (
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  id: string
) => setPlanActive(deps, adminUserId, id, false);

export const activatePlan = (
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  id: string
) => setPlanActive(deps, adminUserId, id, true);
