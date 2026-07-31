import type { BillingInterval, SubscriptionStatus } from '@finance/shared';

/**
 * M5-05 — porta do gateway de pagamento (Stripe). Deliberadamente estreita:
 * nenhum tipo do SDK do Stripe vaza pra camada de aplicação, mesmo princípio
 * de toda porta já existente no projeto. `constructEvent` traduz o webhook
 * bruto pro `PaymentEvent` estreito abaixo — só os 3 tipos de evento que
 * importam pro sistema; qualquer outro webhook vira `{ type: 'ignored' }`.
 */
export interface PaymentGateway {
  createProduct(input: {
    name: string;
    description?: string | null;
  }): Promise<{ id: string }>;
  createPrice(input: {
    productId: string;
    unitAmountCents: number;
    interval: BillingInterval;
    intervalCount: number;
  }): Promise<{ id: string }>;
  createCheckoutSession(input: {
    customerId?: string;
    customerEmail: string;
    priceId: string;
    workspaceId: string;
    trialDays: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  createBillingPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  /**
   * Lança erro em assinatura inválida — nunca retorna um evento não
   * confiável. Assíncrono porque o Bun não expõe crypto síncrono pro SDK do
   * Stripe (SubtleCrypto é async-only) — `constructEvent` síncrono lança
   * `CryptoProviderOnlySupportsAsyncError` em runtime.
   */
  constructEvent(
    rawBody: string,
    signature: string | null
  ): Promise<PaymentEvent>;
}

export type PaymentEvent =
  | {
      id: string;
      type: 'checkout.session.completed';
      workspaceId: string;
      customerId: string;
      subscriptionId: string;
    }
  | {
      id: string;
      type: 'subscription.updated';
      customerId: string;
      subscriptionId: string;
      status: SubscriptionStatus;
      priceId: string;
      trialEndsAt: Date | null;
      currentPeriodEndsAt: Date;
      cancelAtPeriodEnd: boolean;
    }
  | {
      id: string;
      type: 'subscription.deleted';
      customerId: string;
      subscriptionId: string;
    }
  | { id: string; type: 'ignored' };
