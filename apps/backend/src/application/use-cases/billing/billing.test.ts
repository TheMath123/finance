/**
 * M5-05 — checkout/portal do Stripe (com gateway fake, sem chave real) e
 * sincronização de estado de assinatura a partir de eventos de webhook.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { createDb, type Db } from '@finance/db';
import { resolveEffectivePlan } from '../../../domain/services/resolve-effective-plan';
import { cleanupTestPlans } from '../../../test/cleanup-test-plans';
import { createTestDeps } from '../../../test/deps';
import {
  activatePlan,
  addPlanPrice,
  createPlan,
  setWorkspacePlan,
} from '../admin';
import { register } from '../auth';
import { startBillingPortal } from './start-billing-portal';
import { startCheckout } from './start-checkout';
import { syncStripeWebhookEvent } from './sync-stripe-webhook-event';

const uniqueEmail = () => `test-billing-${crypto.randomUUID()}@test.local`;
const uniquePlanKey = () =>
  `test-billing-plan-${crypto.randomUUID().slice(0, 8)}`;

const db: Db = createDb();

afterAll(async () => {
  await cleanupTestPlans(db, ['test-billing-plan-'], ['test-billing-']);
});

async function registerOwner(deps: ReturnType<typeof createTestDeps>) {
  const result = await register(deps, {
    name: 'Dono Billing',
    email: uniqueEmail(),
    password: 'senha-forte-123',
  });
  if (!result.ok) throw new Error('falha ao registrar usuário de teste');
  return {
    userId: result.value.user.id,
    workspaceId: result.value.defaultWorkspaceId,
    role: 'owner' as const,
  };
}

async function createTestPlanWithPrice(
  deps: ReturnType<typeof createTestDeps>,
  adminUserId: string
) {
  const plan = await createPlan(deps, adminUserId, {
    key: uniquePlanKey(),
    name: 'Plano de Teste Billing',
    trialDays: 0,
    limits: {
      maxOwnedSharedWorkspaces: 1,
      maxMembersPerWorkspace: 5,
      maxSavedFormulasPerWorkspace: 10,
    },
    features: [],
  });
  if (!plan.ok) throw new Error('falha ao criar plano de teste');
  await activatePlan(deps, adminUserId, plan.value.id);

  const price = await addPlanPrice(deps, adminUserId, plan.value.id, {
    billingIntervalUnit: 'month',
    billingIntervalCount: 1,
    priceCents: 4990,
    maxInstallments: 1,
    paymentMethods: ['credit_card', 'debit_card', 'pix'],
    isDefault: true,
    sortOrder: 0,
  });
  if (!price.ok) throw new Error('falha ao criar preço de teste');

  return { planId: plan.value.id, planPriceId: price.value.id };
}

describe('billing: checkout e portal (gateway fake)', () => {
  test('startCheckout sincroniza stripeProductId/stripePriceId lazy e devolve URL', async () => {
    const deps = createTestDeps(db);
    const owner = await registerOwner(deps);
    const { planId, planPriceId } = await createTestPlanWithPrice(
      deps,
      owner.userId
    );

    const result = await startCheckout(deps, owner, {
      planId,
      planPriceId,
      successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.checkoutUrl).toContain(owner.workspaceId);
    }

    const plan = await deps.repos.plan.findById(planId);
    expect(plan?.stripeProductId).toBeTruthy();
    expect(
      plan?.prices.find((p) => p.id === planPriceId)?.stripePriceId
    ).toBeTruthy();
  });

  test('startCheckout rejeita plano ou preço inexistente', async () => {
    const deps = createTestDeps(db);
    const owner = await registerOwner(deps);

    const badPlan = await startCheckout(deps, owner, {
      planId: crypto.randomUUID(),
      planPriceId: crypto.randomUUID(),
      successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel',
    });
    expect(badPlan.ok).toBe(false);
    if (!badPlan.ok) expect(badPlan.error).toBe('plan_not_found');

    const { planId } = await createTestPlanWithPrice(deps, owner.userId);
    const badPrice = await startCheckout(deps, owner, {
      planId,
      planPriceId: crypto.randomUUID(),
      successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel',
    });
    expect(badPrice.ok).toBe(false);
    if (!badPrice.ok) expect(badPrice.error).toBe('plan_price_not_found');
  });

  test('startCheckout recusa novo checkout quando workspace já tem assinatura ativa', async () => {
    const deps = createTestDeps(db);
    const owner = await registerOwner(deps);
    const { planId, planPriceId } = await createTestPlanWithPrice(
      deps,
      owner.userId
    );

    await syncStripeWebhookEvent(deps, {
      id: `evt_${crypto.randomUUID()}`,
      type: 'checkout.session.completed',
      workspaceId: owner.workspaceId,
      customerId: `cus_already_${crypto.randomUUID()}`,
      subscriptionId: `sub_already_${crypto.randomUUID()}`,
    });

    const result = await startCheckout(deps, owner, {
      planId,
      planPriceId,
      successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('already_subscribed');
  });

  test('startBillingPortal recusa workspace sem assinatura (sem stripeCustomerId)', async () => {
    const deps = createTestDeps(db);
    const owner = await registerOwner(deps);

    const result = await startBillingPortal(
      deps,
      owner,
      'https://app.test/return'
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('no_active_subscription');
  });
});

describe('billing: sincronização de webhook', () => {
  test('checkout.session.completed liga customer/subscription ao workspace certo', async () => {
    const deps = createTestDeps(db);
    const owner = await registerOwner(deps);

    const customerId = `cus_test_${crypto.randomUUID()}`;
    const subscriptionId = `sub_test_${crypto.randomUUID()}`;
    await syncStripeWebhookEvent(deps, {
      id: `evt_${crypto.randomUUID()}`,
      type: 'checkout.session.completed',
      workspaceId: owner.workspaceId,
      customerId,
      subscriptionId,
    });

    const workspace = await deps.repos.workspace.findById(owner.workspaceId);
    expect(workspace?.stripeCustomerId).toBe(customerId);
    expect(workspace?.stripeSubscriptionId).toBe(subscriptionId);
    expect(workspace?.subscriptionStatus).toBe('active');
  });

  test('mesmo event.id não é processado duas vezes (dedup)', async () => {
    const deps = createTestDeps(db);
    const owner = await registerOwner(deps);
    const eventId = `evt_${crypto.randomUUID()}`;
    const dedupCustomerId = `cus_dedup_${crypto.randomUUID()}`;

    await syncStripeWebhookEvent(deps, {
      id: eventId,
      type: 'checkout.session.completed',
      workspaceId: owner.workspaceId,
      customerId: dedupCustomerId,
      subscriptionId: `sub_dedup_${crypto.randomUUID()}`,
    });

    // Segundo evento com o MESMO id, mas dados diferentes — não deveria aplicar.
    await syncStripeWebhookEvent(deps, {
      id: eventId,
      type: 'checkout.session.completed',
      workspaceId: owner.workspaceId,
      customerId: `cus_outro_${crypto.randomUUID()}`,
      subscriptionId: `sub_outro_${crypto.randomUUID()}`,
    });

    const workspace = await deps.repos.workspace.findById(owner.workspaceId);
    expect(workspace?.stripeCustomerId).toBe(dedupCustomerId);
  });

  test('subscription.deleted marca canceled e resolveEffectivePlan cai pro free mesmo com planId ainda no plano pago', async () => {
    const deps = createTestDeps(db);
    const adminOwner = await registerOwner(deps);
    const owner = await registerOwner(deps);
    const { planId } = await createTestPlanWithPrice(deps, adminOwner.userId);

    // Atribui o plano pago e liga a assinatura via checkout, como um fluxo real faria.
    const setPlan = await setWorkspacePlan(
      deps,
      adminOwner.userId,
      owner.workspaceId,
      planId
    );
    expect(setPlan.ok).toBe(true);

    const customerId = `cus_cancel_test_${crypto.randomUUID()}`;
    const subscriptionId = `sub_cancel_test_${crypto.randomUUID()}`;

    await syncStripeWebhookEvent(deps, {
      id: `evt_${crypto.randomUUID()}`,
      type: 'checkout.session.completed',
      workspaceId: owner.workspaceId,
      customerId,
      subscriptionId,
    });

    await syncStripeWebhookEvent(deps, {
      id: `evt_${crypto.randomUUID()}`,
      type: 'subscription.deleted',
      customerId,
      subscriptionId,
    });

    const workspace = await deps.repos.workspace.findById(owner.workspaceId);
    expect(workspace?.subscriptionStatus).toBe('canceled');
    expect(workspace?.planId).toBe(planId); // planId não muda — só o status

    const effectivePlan =
      workspace && (await resolveEffectivePlan(deps, workspace));
    expect(effectivePlan?.key).toBe('free');
  });
});
