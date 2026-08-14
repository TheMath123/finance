import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { Plan, PlanInput } from '../../ports/plan-repository';
import type { AdminError } from './errors';
import { validateFeatureKeys } from './validate-feature-keys';

/** `key` nunca é editável aqui — é o identificador estável usado por lookups internos (ex.: plano `free` no registro). */
export type UpdatePlanInput = Partial<Omit<PlanInput, 'key'>>;

export async function updatePlan(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  id: string,
  input: UpdatePlanInput
): Promise<Either<AdminError, Plan>> {
  const existing = await deps.repos.plan.findById(id);
  if (!existing) return left('plan_not_found');

  if (input.features) {
    const featuresValid = await validateFeatureKeys(deps, input.features);
    if (!featuresValid) return left('unknown_feature_key');
  }

  if (
    input.restrictedToWorkspaceId &&
    input.restrictedToWorkspaceId !== existing.restrictedToWorkspaceId
  ) {
    const workspace = await deps.repos.workspace.findById(
      input.restrictedToWorkspaceId
    );
    if (!workspace) return left('workspace_not_found');

    // Não faz sentido "privatizar" um plano que ainda está em uso por mais
    // de um workspace — só o próprio dono do vínculo (se já houver) escapa
    // dessa checagem, já contado como 1.
    const workspacesUsingPlan =
      await deps.repos.plan.countWorkspacesUsingPlan(id);
    if (workspacesUsingPlan > 1) return left('plan_shared_cannot_restrict');
  }

  const updated = await deps.uow.run(async (repos) => {
    const plan = await repos.plan.update(id, input);
    await repos.adminAudit.record({
      adminUserId,
      action: 'update_plan',
      entity: 'plan',
      entityId: plan.id,
      metadata: input,
    });
    return plan;
  });

  return right(updated);
}
