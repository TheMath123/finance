import { type Either, left, right } from '@finance/shared';
import type { Workspace } from '../../../domain/entities/workspace';
import type { UseCaseDeps } from '../../deps';
import type { AdminError } from './errors';

/**
 * M5-03: zera `trialEndsAt` — marca o workspace como "pagamento confirmado",
 * saindo do trial antes do prazo (sem gateway real, isso é feito manualmente
 * pelo superadmin; ver nota de continuação de M5-03 sobre integração real).
 */
export async function confirmWorkspacePayment(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  workspaceId: string
): Promise<Either<AdminError, Workspace>> {
  const workspace = await deps.repos.workspace.findById(workspaceId);
  if (!workspace) return left('workspace_not_found');

  const updated = await deps.uow.run(async (repos) => {
    const result = await repos.workspace.updatePlan(workspaceId, {
      planId: workspace.planId,
      planPriceId: workspace.planPriceId,
      trialEndsAt: null,
    });
    await repos.adminAudit.record({
      adminUserId,
      action: 'confirm_workspace_payment',
      entity: 'workspace',
      entityId: workspaceId,
    });
    return result;
  });

  return right(updated);
}
