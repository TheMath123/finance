import type { SubscriptionStatus } from '@finance/shared';
import Stripe from 'stripe';
import type {
  PaymentEvent,
  PaymentGateway,
} from '../../application/ports/payment-gateway';
import { loadStripeEnv } from './env';

let cachedClient: Stripe | null = null;
function client(): Stripe {
  if (!cachedClient) {
    cachedClient = new Stripe(loadStripeEnv().STRIPE_SECRET_KEY);
  }
  return cachedClient;
}

/** Stripe manda status que não usamos (unpaid, incomplete_expired, paused) — reduzidos ao subconjunto que importa aqui. */
function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
      return status;
    case 'unpaid':
      return 'past_due';
    case 'incomplete_expired':
      return 'incomplete';
    case 'paused':
      return 'canceled';
  }
}

export function createStripeGateway(): PaymentGateway {
  return {
    async createProduct(input) {
      const product = await client().products.create({
        name: input.name,
        description: input.description ?? undefined,
      });
      return { id: product.id };
    },

    async createPrice(input) {
      const price = await client().prices.create({
        product: input.productId,
        currency: 'brl',
        unit_amount: input.unitAmountCents,
        recurring: {
          interval: input.interval,
          interval_count: input.intervalCount,
        },
      });
      return { id: price.id };
    },

    async createCheckoutSession(input) {
      const session = await client().checkout.sessions.create({
        mode: 'subscription',
        customer: input.customerId,
        customer_email: input.customerId ? undefined : input.customerEmail,
        line_items: [{ price: input.priceId, quantity: 1 }],
        payment_method_types: ['card', 'pix'],
        subscription_data:
          input.trialDays > 0
            ? { trial_period_days: input.trialDays }
            : undefined,
        metadata: { workspaceId: input.workspaceId },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      });
      if (!session.url) throw new Error('Stripe não devolveu URL de checkout');
      return { url: session.url };
    },

    async createBillingPortalSession(input) {
      const session = await client().billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
      });
      return { url: session.url };
    },

    constructEvent(rawBody, signature): PaymentEvent {
      const event = client().webhooks.constructEvent(
        rawBody,
        signature ?? '',
        loadStripeEnv().STRIPE_WEBHOOK_SECRET
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const customerId =
          typeof session.customer === 'string' ? session.customer : null;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : null;
        if (!workspaceId || !customerId || !subscriptionId) {
          return { id: event.id, type: 'ignored' };
        }
        return {
          id: event.id,
          type: 'checkout.session.completed',
          workspaceId,
          customerId,
          subscriptionId,
        };
      }

      if (
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.created'
      ) {
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0];
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : null;
        if (!item || !customerId) return { id: event.id, type: 'ignored' };
        return {
          id: event.id,
          type: 'subscription.updated',
          customerId,
          subscriptionId: sub.id,
          status: mapStatus(sub.status),
          priceId: item.price.id,
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          currentPeriodEndsAt: new Date(item.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : null;
        if (!customerId) return { id: event.id, type: 'ignored' };
        return {
          id: event.id,
          type: 'subscription.deleted',
          customerId,
          subscriptionId: sub.id,
        };
      }

      return { id: event.id, type: 'ignored' };
    },
  };
}
