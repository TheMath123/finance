import type { Actor, UseCaseDeps } from '../../deps';
import type { Plan, PlanPrice } from '../../ports/plan-repository';

export interface BillingStatus {
  plan: Plan;
  planPrice: PlanPrice | null;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEndsAt: Date | null;
  hasStripeCustomer: boolean;
}

/** M5-05 — status de assinatura do workspace atual, pra tela de autoatendimento (qualquer membro pode ver, só o owner pode agir). */
export async function getBillingStatus(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: Actor
): Promise<BillingStatus | undefined> {
  const workspace = await deps.repos.workspace.findById(actor.workspaceId);
  if (!workspace) return undefined;

  const plan = await deps.repos.plan.findById(workspace.planId);
  if (!plan) return undefined;

  const planPrice = workspace.planPriceId
    ? (plan.prices.find((p) => p.id === workspace.planPriceId) ?? null)
    : null;

  return {
    plan,
    planPrice,
    subscriptionStatus: workspace.subscriptionStatus,
    trialEndsAt: workspace.trialEndsAt,
    cancelAtPeriodEnd: workspace.cancelAtPeriodEnd,
    currentPeriodEndsAt: workspace.currentPeriodEndsAt,
    hasStripeCustomer: workspace.stripeCustomerId !== null,
  };
}
