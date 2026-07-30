import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { PlanPrice, PlanPriceInput } from '../../ports/plan-repository';
import type { AdminError } from './errors';

export type UpdatePlanPriceInput = Partial<PlanPriceInput>;

export async function updatePlanPrice(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  priceId: string,
  input: UpdatePlanPriceInput
): Promise<Either<AdminError, PlanPrice>> {
  const existing = await deps.repos.plan.findPriceById(priceId);
  if (!existing) return left('plan_price_not_found');

  const unit = input.billingIntervalUnit ?? existing.billingIntervalUnit;
  const count = input.billingIntervalCount ?? existing.billingIntervalCount;
  if (
    unit !== existing.billingIntervalUnit ||
    count !== existing.billingIntervalCount
  ) {
    const plan = await deps.repos.plan.findById(existing.planId);
    const clashes = plan?.prices.some(
      (p) =>
        p.id !== priceId &&
        p.billingIntervalUnit === unit &&
        p.billingIntervalCount === count
    );
    if (clashes) return left('plan_price_interval_taken');
  }

  const updated = await deps.uow.run(async (repos) => {
    if (input.isDefault)
      await repos.plan.clearDefaultPrice(existing.planId, priceId);
    const price = await repos.plan.updatePrice(priceId, input);
    await repos.adminAudit.record({
      adminUserId,
      action: 'update_plan_price',
      entity: 'plan',
      entityId: existing.planId,
      metadata: { priceId },
    });
    return price;
  });

  return right(updated);
}
