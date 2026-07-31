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
 * Plano que efetivamente vale pros checks de limite/feature. M5-05: um
 * cancelamento real via Stripe (`subscriptionStatus === 'canceled'`) tem
 * prioridade sobre o trial baseado em tempo do M5-03 — este último continua
 * valendo pra trial atribuído manualmente pelo superadmin, sem Stripe
 * envolvido. Nenhum dos dois caminhos depende de job/cron.
 */
export async function resolveEffectivePlan(
  deps: Pick<UseCaseDeps, 'repos'>,
  workspace: Pick<Workspace, 'planId' | 'trialEndsAt' | 'subscriptionStatus'>
): Promise<Plan | undefined> {
  if (workspace.subscriptionStatus === 'canceled') {
    return deps.repos.plan.findByKey('free');
  }
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
  workspace: Pick<Workspace, 'planId' | 'trialEndsAt' | 'subscriptionStatus'>,
  featureKey: string
): Promise<boolean> {
  const plan = await resolveEffectivePlan(deps, workspace);
  if (!plan || !hasFeature(plan, featureKey)) return false;
  const flag = await deps.repos.featureFlag.findByKey(featureKey);
  return flag?.enabled ?? false;
}
