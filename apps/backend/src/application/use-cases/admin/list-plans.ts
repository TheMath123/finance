import type { UseCaseDeps } from '../../deps';
import type { Plan } from '../../ports/plan-repository';

export function listPlans(deps: Pick<UseCaseDeps, 'repos'>): Promise<Plan[]> {
  return deps.repos.plan.list();
}
