import { type Either, left, type PlanLimits } from '@finance/shared';
import type { Workspace } from '../../../domain/entities/workspace';
import type { UseCaseDeps } from '../../deps';
import type { PlanPriceInput } from '../../ports/plan-repository';
import type { AdminError } from './errors';
import { assignPlanToWorkspace } from './set-workspace-plan';
import { validateFeatureKeys } from './validate-feature-keys';

export interface CreatePrivatePlanForWorkspaceInput {
  name: string;
  description?: string | null;
  trialDays: number;
  limits: PlanLimits;
  features: string[];
  price: PlanPriceInput;
}

/**
 * Ação combinada do painel `/saas/workspaces`: cria um plano privado (sob
 * medida, sem aparecer no catálogo de auto-atendimento) já vinculado a este
 * workspace, e atribui na mesma tacada — mesma lógica de trial/cancelamento
 * de Stripe de `setWorkspacePlan`, via `assignPlanToWorkspace`. `key` é
 * gerada automaticamente (nunca exposta no form: um plano privado não
 * precisa de identificador legível, só existe pra este workspace).
 */
export async function createPrivatePlanForWorkspace(
  deps: Pick<UseCaseDeps, 'repos' | 'uow' | 'payments'>,
  adminUserId: string,
  workspaceId: string,
  input: CreatePrivatePlanForWorkspaceInput
): Promise<Either<AdminError, Workspace>> {
  const workspace = await deps.repos.workspace.findById(workspaceId);
  if (!workspace) return left('workspace_not_found');

  const featuresValid = await validateFeatureKeys(deps, input.features);
  if (!featuresValid) return left('unknown_feature_key');

  const key = `private-${workspaceId.slice(0, 8)}-${Date.now()}`;

  const result = await deps.uow.run(async (repos) => {
    const plan = await repos.plan.create({
      key,
      name: input.name,
      description: input.description ?? null,
      trialDays: input.trialDays,
      limits: input.limits,
      features: input.features,
      restrictedToWorkspaceId: workspaceId,
    });
    await repos.plan.addPrice(plan.id, { ...input.price, isDefault: true });
    await repos.adminAudit.record({
      adminUserId,
      action: 'create_plan',
      entity: 'plan',
      entityId: plan.id,
      metadata: { key: plan.key, restrictedToWorkspaceId: workspaceId },
    });
    return await repos.plan.findById(plan.id);
  });

  if (!result) throw new Error('falha ao criar plano privado');

  return assignPlanToWorkspace(deps, adminUserId, workspace, result);
}
