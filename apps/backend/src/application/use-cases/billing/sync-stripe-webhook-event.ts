import type { UseCaseDeps } from '../../deps';
import type { PaymentEvent } from '../../ports/payment-gateway';

const EVENT_DEDUP_TTL_SECONDS = 7 * 24 * 60 * 60;

/** true se já processamos esse evento — mesmo padrão do dedup por `wamid` do webhook do WhatsApp (M2-06). */
async function alreadyProcessed(
  deps: Pick<UseCaseDeps, 'cache'>,
  eventId: string
): Promise<boolean> {
  const key = `stripe:event:${eventId}`;
  if (await deps.cache.get<true>(key)) return true;
  await deps.cache.set(key, true, EVENT_DEDUP_TTL_SECONDS);
  return false;
}

/**
 * M5-05 — sincroniza o estado de assinatura a partir de um evento já
 * traduzido/validado pelo `PaymentGateway.constructEvent`. Processado
 * síncrono dentro do handler HTTP do webhook (rápido, só grava no banco —
 * diferente do WhatsApp, que dispara pipeline de IA e por isso enfileira).
 */
export async function syncStripeWebhookEvent(
  deps: Pick<UseCaseDeps, 'repos' | 'cache'>,
  event: PaymentEvent
): Promise<void> {
  if (event.type === 'ignored') return;
  if (await alreadyProcessed(deps, event.id)) return;

  if (event.type === 'checkout.session.completed') {
    const workspace = await deps.repos.workspace.findById(event.workspaceId);
    if (!workspace) return;
    await deps.repos.workspace.updateSubscriptionState(workspace.id, {
      stripeCustomerId: event.customerId,
      stripeSubscriptionId: event.subscriptionId,
      // Status definitivo (trialing vs active) chega logo em seguida via
      // customer.subscription.created/updated — este é só o vínculo inicial.
      subscriptionStatus: 'active',
    });
    return;
  }

  if (event.type === 'subscription.updated') {
    const workspace = await deps.repos.workspace.findByStripeSubscriptionId(
      event.subscriptionId
    );
    if (!workspace) return;

    const planPrice = await deps.repos.plan.findPriceByStripePriceId(
      event.priceId
    );

    await deps.repos.workspace.updateSubscriptionState(workspace.id, {
      subscriptionStatus: event.status,
      trialEndsAt: event.trialEndsAt,
      currentPeriodEndsAt: event.currentPeriodEndsAt,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      ...(planPrice
        ? { planId: planPrice.planId, planPriceId: planPrice.id }
        : {}),
    });
    return;
  }

  if (event.type === 'subscription.deleted') {
    const workspace = await deps.repos.workspace.findByStripeSubscriptionId(
      event.subscriptionId
    );
    if (!workspace) return;
    await deps.repos.workspace.updateSubscriptionState(workspace.id, {
      subscriptionStatus: 'canceled',
    });
  }
}
