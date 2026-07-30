import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { PlanPrice, PlanPriceInput } from '../../ports/plan-repository';
import type { AdminError } from './errors';

export async function addPlanPrice(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  planId: string,
  input: PlanPriceInput
): Promise<Either<AdminError, PlanPrice>> {
  const plan = await deps.repos.plan.findById(planId);
  if (!plan) return left('plan_not_found');

  const clashes = plan.prices.some(
    (p) =>
      p.billingIntervalUnit === input.billingIntervalUnit &&
      p.billingIntervalCount === input.billingIntervalCount
  );
  if (clashes) return left('plan_price_interval_taken');

  const created = await deps.uow.run(async (repos) => {
    if (input.isDefault) await repos.plan.clearDefaultPrice(planId);
    const price = await repos.plan.addPrice(planId, input);
    await repos.adminAudit.record({
      adminUserId,
      action: 'add_plan_price',
      entity: 'plan',
      entityId: planId,
      metadata: { priceId: price.id },
    });
    return price;
  });

  return right(created);
}
