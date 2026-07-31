import { Elysia } from 'elysia';
import { syncStripeWebhookEvent } from '../../../../application/use-cases/billing/sync-stripe-webhook-event';
import type { AppDeps } from '../../../deps';

/**
 * Webhook do Stripe — sem guard de auth, igual ao webhook do WhatsApp
 * (M2-06): a "autenticação" é inteiramente a verificação de assinatura
 * (`stripe-signature`) dentro do handler. Processado síncrono (rápido, só
 * grava no banco — diferente do WhatsApp, que dispara pipeline de IA e por
 * isso enfileira).
 */
export const stripeWebhookRoute = (deps: AppDeps) =>
  new Elysia().post('/webhooks/stripe', async ({ request, set }) => {
    const raw = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event: Awaited<ReturnType<AppDeps['payments']['constructEvent']>>;
    try {
      event = await deps.payments.constructEvent(raw, signature);
    } catch (error) {
      deps.httpLogger.warn(
        { scope: 'stripe', err: error },
        'webhook_signature_rejected'
      );
      set.status = 401;
      return;
    }

    set.status = 200;
    await syncStripeWebhookEvent(deps, event);
  });
