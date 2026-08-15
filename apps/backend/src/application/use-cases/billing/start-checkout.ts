import { type Either, left, right } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import type { BillingError } from './errors';

export interface StartCheckoutInput {
  planId: string;
  planPriceId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * M5-05 — inicia o Stripe Checkout hospedado (autoatendimento, M5-04) pro
 * owner do workspace assinar um plano. Sincroniza lazy o Product/Price do
 * Stripe (só na primeira vez que esse plano/preço é usado, nunca em massa)
 * — o Customer é criado pelo próprio Stripe durante o checkout quando o
 * workspace ainda não tem um (`customerId` omitido, `customerEmail`
 * informado); o `checkout.session.completed` grava o id de volta.
 */
export async function startCheckout(
  deps: Pick<UseCaseDeps, 'repos' | 'payments'>,
  actor: Actor,
  input: StartCheckoutInput
): Promise<Either<BillingError, { checkoutUrl: string }>> {
  const plan = await deps.repos.plan.findById(input.planId);
  if (!plan) return left('plan_not_found');

  // Plano privado: só o superadmin vincula (set-workspace-plan), nunca via
  // checkout — nem pro próprio workspace dono dele.
  if (plan.isPrivate) return left('plan_not_purchasable');

  const planPrice = plan.prices.find((p) => p.id === input.planPriceId);
  if (!planPrice) return left('plan_price_not_found');

  const workspace = await deps.repos.workspace.findById(actor.workspaceId);
  if (!workspace) return left('plan_not_found');

  // Troca/cancelamento de assinatura já ativa passa pelo Customer Portal
  // (start-billing-portal), nunca por um novo checkout — evita o workspace
  // acabar com duas assinaturas simultâneas no Stripe.
  if (
    workspace.stripeCustomerId &&
    ['trialing', 'active', 'past_due'].includes(workspace.subscriptionStatus)
  ) {
    return left('already_subscribed');
  }

  const user = await deps.repos.user.findById(actor.userId);
  if (!user) return left('plan_not_found');

  let stripeProductId = plan.stripeProductId;
  if (!stripeProductId) {
    const product = await deps.payments.createProduct({
      name: plan.name,
      description: plan.description,
    });
    stripeProductId = product.id;
    await deps.repos.plan.setStripeProductId(plan.id, stripeProductId);
  }

  let stripePriceId = planPrice.stripePriceId;
  if (!stripePriceId) {
    const price = await deps.payments.createPrice({
      productId: stripeProductId,
      unitAmountCents: planPrice.priceCents,
      interval: planPrice.billingIntervalUnit,
      intervalCount: planPrice.billingIntervalCount,
    });
    stripePriceId = price.id;
    await deps.repos.plan.setStripePriceId(planPrice.id, stripePriceId);
  }

  const { url } = await deps.payments.createCheckoutSession({
    customerId: workspace.stripeCustomerId ?? undefined,
    customerEmail: user.email,
    priceId: stripePriceId,
    workspaceId: workspace.id,
    trialDays: plan.trialDays,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });

  return right({ checkoutUrl: url });
}
