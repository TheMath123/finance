import type { UseCaseDeps } from '../../application/deps';
import type { Plan } from '../../application/ports/plan-repository';
import type { Workspace } from '../entities/workspace';
import { hasFeature } from './plan-limits';

/** Trial vencido = `trialEndsAt` setado e no passado. Sem trial (`null`) nunca conta como vencido. */
export function isTrialExpired(
  workspace: Pick<Workspace, 'trialEndsAt'>,
  now: Date = new Date()
): boolean {
  return workspace.trialEndsAt !== null && workspace.trialEndsAt <= now;
}

/**
 * Plano que efetivamente vale pros checks de limite/feature — cai pro plano
 * `free` automaticamente quando o trial do workspace já venceu (M5-03),
 * sem depender de job/cron nem de saber status real de pagamento (isso é
 * escopo de uma integração de gateway futura, fora daqui).
 */
export async function resolveEffectivePlan(
  deps: Pick<UseCaseDeps, 'repos'>,
  workspace: Pick<Workspace, 'planId' | 'trialEndsAt'>
): Promise<Plan | undefined> {
  if (isTrialExpired(workspace)) return deps.repos.plan.findByKey('free');
  return deps.repos.plan.findById(workspace.planId);
}

/**
 * Acesso a uma feature travada por plano (M5-03) = a chave está no array de
 * features do plano efetivo do workspace E a feature flag global (M4-09,
 * kill-switch) correspondente está ligada — unifica os dois vocabulários.
 */
export async function hasFeatureAccess(
  deps: Pick<UseCaseDeps, 'repos'>,
  workspace: Pick<Workspace, 'planId' | 'trialEndsAt'>,
  featureKey: string
): Promise<boolean> {
  const plan = await resolveEffectivePlan(deps, workspace);
  if (!plan || !hasFeature(plan, featureKey)) return false;
  const flag = await deps.repos.featureFlag.findByKey(featureKey);
  return flag?.enabled ?? false;
}
