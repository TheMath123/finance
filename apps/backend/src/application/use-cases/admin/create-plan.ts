import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { Plan, PlanInput } from '../../ports/plan-repository';
import type { AdminError } from './errors';

export async function createPlan(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  input: PlanInput
): Promise<Either<AdminError, Plan>> {
  const existing = await deps.repos.plan.findByKey(input.key);
  if (existing) return left('plan_key_taken');

  const created = await deps.uow.run(async (repos) => {
    const plan = await repos.plan.create(input);
    await repos.adminAudit.record({
      adminUserId,
      action: 'create_plan',
      entity: 'plan',
      entityId: plan.id,
      metadata: { key: plan.key },
    });
    return plan;
  });

  return right(created);
}
