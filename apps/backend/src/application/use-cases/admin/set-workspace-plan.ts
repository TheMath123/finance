import { type Either, left, right } from '@finance/shared';
import type { Workspace } from '../../../domain/entities/workspace';
import type { UseCaseDeps } from '../../deps';
import type { AdminError } from './errors';

/** Controle manual do plano de um workspace pelo superadmin (M5-02) — hoje é a única forma de mudar plano fora do fluxo de cobrança (que ainda não existe, M5-03). */
export async function setWorkspacePlan(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  workspaceId: string,
  planId: string
): Promise<Either<AdminError, Workspace>> {
  const workspace = await deps.repos.workspace.findById(workspaceId);
  if (!workspace) return left('workspace_not_found');

  const plan = await deps.repos.plan.findById(planId);
  if (!plan) return left('plan_not_found');

  const updated = await deps.uow.run(async (repos) => {
    const result = await repos.workspace.updatePlan(workspaceId, planId);
    await repos.adminAudit.record({
      adminUserId,
      action: 'set_workspace_plan',
      entity: 'workspace',
      entityId: workspaceId,
      metadata: { fromPlanId: workspace.planId, toPlanId: planId },
    });
    return result;
  });

  return right(updated);
}
