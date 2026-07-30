import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AdminError } from './errors';

export async function deletePlanPrice(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  priceId: string
): Promise<Either<AdminError, null>> {
  const existing = await deps.repos.plan.findPriceById(priceId);
  if (!existing) return left('plan_price_not_found');

  const count = await deps.repos.plan.countPricesForPlan(existing.planId);
  if (count <= 1) return left('plan_price_required');

  await deps.uow.run(async (repos) => {
    await repos.plan.deletePrice(priceId);
    await repos.adminAudit.record({
      adminUserId,
      action: 'delete_plan_price',
      entity: 'plan',
      entityId: existing.planId,
      metadata: { priceId },
    });
  });

  return right(null);
}
