import type { UseCaseDeps } from '../../deps';
import type { Plan } from '../../ports/plan-repository';

/** M5-05 — planos disponíveis pra qualquer usuário autenticado (não é admin-only, ao contrário de `admin/list-plans.ts`). */
export function listAvailablePlans(
  deps: Pick<UseCaseDeps, 'repos'>
): Promise<Plan[]> {
  return deps.repos.plan.listActive();
}
