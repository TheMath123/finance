/**
 * M5-02 — CRUD de planos, listagem de workspaces (dono + plano) e troca
 * manual de plano pelo superadmin, contra o Postgres local.
 * M5-03 — preços múltiplos por plano, validação de features contra
 * feature_flags, trial baseado em tempo (fallback pro free quando vence) e
 * confirmação manual de pagamento.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { adminAuditLogs, createDb, type Db, workspaces } from '@finance/db';
import { eq } from 'drizzle-orm';
import { cleanupTestPlans } from '../../../test/cleanup-test-plans';
import { createTestDeps } from '../../../test/deps';
import { register } from '../auth';
import { listAvailablePlans } from '../billing/list-available-plans';
import { startCheckout } from '../billing/start-checkout';
import { createSavedFormula } from '../saved-formula/create-saved-formula';
import { createWorkspace } from '../workspace/create-workspace';
import {
  activatePlan,
  addPlanPrice,
  confirmWorkspacePayment,
  createPlan,
  createPrivatePlanForWorkspace,
  deactivatePlan,
  deletePlanPrice,
  listPlans,
  listWorkspaces,
  setWorkspacePlan,
  updatePlan,
  updatePlanPrice,
} from '.';

const uniqueEmail = () => `test-plans-${crypto.randomUUID()}@test.local`;
const uniquePlanKey = () => `test-plan-${crypto.randomUUID().slice(0, 8)}`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

afterAll(async () => {
  await cleanupTestPlans(db, ['test-plan-'], ['test-plans-']);
});

async function registerAdmin(
  deps: ReturnType<typeof createTestDeps>
): Promise<string> {
  const result = await register(deps, {
    name: 'Admin de Teste',
    email: uniqueEmail(),
    password: 'senha-forte-123',
  });
  if (!result.ok) throw new Error('falha ao registrar admin de teste');
  return result.value.user.id;
}

function draftPlanInput(
  key: string,
  maxSavedFormulasPerWorkspace = 10,
  trialDays = 0
) {
  return {
    key,
    name: 'Plano de Teste',
    trialDays,
    limits: {
      maxOwnedSharedWorkspaces: 1,
      maxMembersPerWorkspace: 5,
      maxSavedFormulasPerWorkspace,
    },
    features: [] as string[],
  };
}

describe('admin: CRUD de planos', () => {
  test('cria, atualiza, desativa e reativa', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const key = uniquePlanKey();

    const created = await createPlan(deps, adminUserId, draftPlanInput(key));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.key).toBe(key);
    expect(created.value.isActive).toBe(true);
    expect(created.value.prices).toEqual([]);

    const updated = await updatePlan(deps, adminUserId, created.value.id, {
      name: 'Plano Renomeado',
      trialDays: 5,
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.name).toBe('Plano Renomeado');
      expect(updated.value.trialDays).toBe(5);
    }

    const deactivated = await deactivatePlan(
      deps,
      adminUserId,
      created.value.id
    );
    expect(deactivated.ok).toBe(true);
    if (deactivated.ok) expect(deactivated.value.isActive).toBe(false);

    const list = await listPlans(deps);
    expect(list.some((p) => p.key === key && !p.isActive)).toBe(true);

    const reactivated = await activatePlan(deps, adminUserId, created.value.id);
    expect(reactivated.ok).toBe(true);
    if (reactivated.ok) expect(reactivated.value.isActive).toBe(true);

    const auditRows = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.entityId, created.value.id));
    const actions = auditRows.map((r) => r.action);
    expect(actions).toContain('create_plan');
    expect(actions).toContain('update_plan');
    expect(actions).toContain('deactivate_plan');
    expect(actions).toContain('activate_plan');
  });

  test('rejeita key duplicada', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const key = uniquePlanKey();

    const first = await createPlan(deps, adminUserId, draftPlanInput(key));
    expect(first.ok).toBe(true);

    const second = await createPlan(deps, adminUserId, draftPlanInput(key));
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('plan_key_taken');
  });

  test('rejeita feature que não existe como feature flag cadastrada', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);

    const withUnknownFeature = await createPlan(deps, adminUserId, {
      ...draftPlanInput(uniquePlanKey()),
      features: [`feature_inexistente_${crypto.randomUUID().slice(0, 8)}`],
    });
    expect(withUnknownFeature.ok).toBe(false);
    if (!withUnknownFeature.ok)
      expect(withUnknownFeature.error).toBe('unknown_feature_key');

    const flagKey = `test-flag-${crypto.randomUUID().slice(0, 8)}`;
    await deps.repos.featureFlag.upsert(flagKey, { enabled: true });

    const withKnownFeature = await createPlan(deps, adminUserId, {
      ...draftPlanInput(uniquePlanKey()),
      features: [flagKey],
    });
    expect(withKnownFeature.ok).toBe(true);
    if (withKnownFeature.ok)
      expect(withKnownFeature.value.features).toEqual([flagKey]);
  });
});

describe('admin: CRUD de opções de preço (plan_prices)', () => {
  test('adiciona, rejeita intervalo duplicado, atualiza e recusa excluir a última', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const plan = await createPlan(
      deps,
      adminUserId,
      draftPlanInput(uniquePlanKey())
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    const monthly = await addPlanPrice(deps, adminUserId, plan.value.id, {
      billingIntervalUnit: 'month',
      billingIntervalCount: 1,
      priceCents: 1990,
      maxInstallments: 1,
      paymentMethods: ['credit_card', 'debit_card', 'pix'],
      isDefault: true,
      sortOrder: 0,
    });
    expect(monthly.ok).toBe(true);
    if (!monthly.ok) return;

    const clash = await addPlanPrice(deps, adminUserId, plan.value.id, {
      billingIntervalUnit: 'month',
      billingIntervalCount: 1,
      priceCents: 2990,
      maxInstallments: 1,
      paymentMethods: ['pix'],
      isDefault: false,
      sortOrder: 1,
    });
    expect(clash.ok).toBe(false);
    if (!clash.ok) expect(clash.error).toBe('plan_price_interval_taken');

    const yearly = await addPlanPrice(deps, adminUserId, plan.value.id, {
      billingIntervalUnit: 'year',
      billingIntervalCount: 1,
      priceCents: 19990,
      maxInstallments: 12,
      paymentMethods: ['credit_card'],
      isDefault: true,
      sortOrder: 1,
    });
    expect(yearly.ok).toBe(true);
    if (!yearly.ok) return;

    // Marcar o anual como default deve ter desmarcado o mensal.
    const afterYearly = await deps.repos.plan.findById(plan.value.id);
    const monthlyRow = afterYearly?.prices.find(
      (p) => p.id === monthly.value.id
    );
    expect(monthlyRow?.isDefault).toBe(false);

    const updatedYearly = await updatePlanPrice(
      deps,
      adminUserId,
      yearly.value.id,
      {
        priceCents: 17990,
      }
    );
    expect(updatedYearly.ok).toBe(true);
    if (updatedYearly.ok) expect(updatedYearly.value.priceCents).toBe(17990);

    const deletedMonthly = await deletePlanPrice(
      deps,
      adminUserId,
      monthly.value.id
    );
    expect(deletedMonthly.ok).toBe(true);

    const deletedLast = await deletePlanPrice(
      deps,
      adminUserId,
      yearly.value.id
    );
    expect(deletedLast.ok).toBe(false);
    if (!deletedLast.ok) expect(deletedLast.error).toBe('plan_price_required');
  });
});

describe('admin: listagem de workspaces + troca de plano', () => {
  test('lista workspace com dono e plano corretos', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const registered = await register(deps, {
      name: 'Dono do Workspace',
      email,
      password: 'senha-forte-123',
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const { workspaces: rows } = await listWorkspaces(deps, {
      limit: 100,
      offset: 0,
      search: 'Pessoal',
    });
    const found = rows.find((w) => w.ownerEmail === email.toLowerCase());
    expect(found).toBeDefined();
    expect(found?.plan.key).toBe('free');
    expect(found?.memberCount).toBe(1);
  });

  test('trocar o plano de um workspace muda o limite aplicado imediatamente', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);

    const owner = await register(deps, {
      name: 'Dono Fórmulas',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const actor = {
      userId: owner.value.user.id,
      workspaceId: owner.value.defaultWorkspaceId,
      role: 'owner' as const,
    };

    // Plano de teste com limite de 1 fórmula salva por workspace.
    const restrictiveKey = uniquePlanKey();
    const restrictivePlan = await createPlan(
      deps,
      adminUserId,
      draftPlanInput(restrictiveKey, 1)
    );
    expect(restrictivePlan.ok).toBe(true);
    if (!restrictivePlan.ok) return;

    const setPlan = await setWorkspacePlan(
      deps,
      adminUserId,
      actor.workspaceId,
      restrictivePlan.value.id
    );
    expect(setPlan.ok).toBe(true);

    const auditRows = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.entityId, actor.workspaceId));
    expect(auditRows.some((r) => r.action === 'set_workspace_plan')).toBe(true);

    const first = await createSavedFormula(deps, actor, {
      name: 'Fórmula 1',
      expression: 'receitas',
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(first.ok).toBe(true);

    const second = await createSavedFormula(deps, actor, {
      name: 'Fórmula 2',
      expression: 'despesas',
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('plan_limit_reached');

    // Plano generoso libera a criação de novo, sem mexer em mais nada.
    const generousKey = uniquePlanKey();
    const generousPlan = await createPlan(
      deps,
      adminUserId,
      draftPlanInput(generousKey, 10)
    );
    expect(generousPlan.ok).toBe(true);
    if (!generousPlan.ok) return;
    await setWorkspacePlan(
      deps,
      adminUserId,
      actor.workspaceId,
      generousPlan.value.id
    );

    const third = await createSavedFormula(deps, actor, {
      name: 'Fórmula 3',
      expression: 'saldo',
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(third.ok).toBe(true);
  });

  test('rejeita workspace ou plano inexistente', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);

    const badWorkspace = await setWorkspacePlan(
      deps,
      adminUserId,
      crypto.randomUUID(),
      crypto.randomUUID()
    );
    expect(badWorkspace.ok).toBe(false);
    if (!badWorkspace.ok)
      expect(badWorkspace.error).toBe('workspace_not_found');

    const owner = await register(deps, {
      name: 'Dono 2',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const badPlan = await setWorkspacePlan(
      deps,
      adminUserId,
      owner.value.defaultWorkspaceId,
      crypto.randomUUID()
    );
    expect(badPlan.ok).toBe(false);
    if (!badPlan.ok) expect(badPlan.error).toBe('plan_not_found');
  });
});

describe('admin: trial baseado em tempo (M5-03)', () => {
  test('atribuir plano com trialDays > 0 inicia o trial, e trial vencido cai pro limite do free', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);

    const owner = await register(deps, {
      name: 'Dono Trial',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const actor = {
      userId: owner.value.user.id,
      workspaceId: owner.value.defaultWorkspaceId,
      role: 'owner' as const,
    };

    const trialPlan = await createPlan(
      deps,
      adminUserId,
      draftPlanInput(uniquePlanKey(), 100, 3)
    );
    expect(trialPlan.ok).toBe(true);
    if (!trialPlan.ok) return;

    const setPlan = await setWorkspacePlan(
      deps,
      adminUserId,
      actor.workspaceId,
      trialPlan.value.id
    );
    expect(setPlan.ok).toBe(true);
    if (setPlan.ok) expect(setPlan.value.trialEndsAt).not.toBeNull();

    // Free real (seed) tem maxSavedFormulasPerWorkspace = 10 — com o trial
    // ativo, o limite em vigor é o do plano generoso (100), então cria 11.
    for (let i = 1; i <= 11; i++) {
      const created = await createSavedFormula(deps, actor, {
        name: `Fórmula trial ${i}`,
        expression: 'receitas',
        displayFormat: 'currency',
        pinnedHome: false,
        pinnedTransactions: false,
      });
      expect(created.ok).toBe(true);
    }

    // Força o trial a já ter vencido (sem esperar 3 dias de verdade).
    await db
      .update(workspaces)
      .set({ trialEndsAt: new Date(Date.now() - 1000) })
      .where(eq(workspaces.id, actor.workspaceId));

    // Com o trial vencido, resolveEffectivePlan cai pro free (limite real 10)
    // — já existem 11 fórmulas, então a 12ª é bloqueada.
    const afterExpiry = await createSavedFormula(deps, actor, {
      name: 'Fórmula pós-trial',
      expression: 'saldo',
      displayFormat: 'currency',
      pinnedHome: false,
      pinnedTransactions: false,
    });
    expect(afterExpiry.ok).toBe(false);
    if (!afterExpiry.ok) expect(afterExpiry.error).toBe('plan_limit_reached');
  });

  test('confirmar pagamento zera o trial', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);

    const owner = await register(deps, {
      name: 'Dono Confirmação',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const trialPlan = await createPlan(
      deps,
      adminUserId,
      draftPlanInput(uniquePlanKey(), 100, 7)
    );
    expect(trialPlan.ok).toBe(true);
    if (!trialPlan.ok) return;

    const setPlan = await setWorkspacePlan(
      deps,
      adminUserId,
      owner.value.defaultWorkspaceId,
      trialPlan.value.id
    );
    expect(setPlan.ok).toBe(true);
    if (setPlan.ok) expect(setPlan.value.trialEndsAt).not.toBeNull();

    const confirmed = await confirmWorkspacePayment(
      deps,
      adminUserId,
      owner.value.defaultWorkspaceId
    );
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) expect(confirmed.value.trialEndsAt).toBeNull();
  });
});

describe('workspace: criar workspace usa o plano free real (M5-02)', () => {
  test('segundo workspace compartilhado é bloqueado pelo limite do plano free', async () => {
    const deps = createTestDeps(db);
    const owner = await register(deps, {
      name: 'Dono Criação',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const first = await createWorkspace(deps, owner.value.user.id, {
      name: 'Primeira Compartilhada',
    });
    expect(first.ok).toBe(true);

    const second = await createWorkspace(deps, owner.value.user.id, {
      name: 'Segunda Compartilhada',
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('plan_limit_reached');
  });
});

describe('admin: planos privados', () => {
  function draftPrivatePlanInput(maxSavedFormulasPerWorkspace = 10) {
    return {
      name: 'Plano Privado de Teste',
      trialDays: 0,
      limits: {
        maxOwnedSharedWorkspaces: 1,
        maxMembersPerWorkspace: 5,
        maxSavedFormulasPerWorkspace,
      },
      features: [] as string[],
      price: {
        billingIntervalUnit: 'month' as const,
        billingIntervalCount: 1,
        priceCents: 50000,
        maxInstallments: 1,
        paymentMethods: ['credit_card', 'pix'] as (
          | 'credit_card'
          | 'debit_card'
          | 'pix'
        )[],
        isDefault: true,
        sortOrder: 0,
      },
    };
  }

  test('plano privado nunca aparece no catálogo de auto-atendimento', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const owner = await register(deps, {
      name: 'Dono Privado',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const created = await createPrivatePlanForWorkspace(
      deps,
      adminUserId,
      owner.value.defaultWorkspaceId,
      draftPrivatePlanInput()
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.planId).not.toBeNull();

    const catalog = await listAvailablePlans(deps);
    expect(catalog.some((p) => p.id === created.value.planId)).toBe(false);
  });

  test('checkout rejeita plano privado, mesmo pro workspace dono dele', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const owner = await register(deps, {
      name: 'Dono Checkout Privado',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const created = await createPrivatePlanForWorkspace(
      deps,
      adminUserId,
      owner.value.defaultWorkspaceId,
      draftPrivatePlanInput()
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const workspaceAfter = await deps.repos.workspace.findById(
      owner.value.defaultWorkspaceId
    );
    const plan = await deps.repos.plan.findById(workspaceAfter?.planId ?? '');
    expect(plan).toBeDefined();
    if (!plan) return;

    const checkout = await startCheckout(
      deps,
      {
        userId: owner.value.user.id,
        workspaceId: owner.value.defaultWorkspaceId,
        role: 'owner',
      },
      {
        planId: plan.id,
        planPriceId: plan.prices[0]?.id ?? '',
        successUrl: 'https://app.test/success',
        cancelUrl: 'https://app.test/cancel',
      }
    );
    expect(checkout.ok).toBe(false);
    if (!checkout.ok) expect(checkout.error).toBe('plan_not_purchasable');
  });

  test('rejeita atribuir plano privado de outro workspace', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const ownerA = await register(deps, {
      name: 'Dono A',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    const ownerB = await register(deps, {
      name: 'Dono B',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(ownerA.ok).toBe(true);
    expect(ownerB.ok).toBe(true);
    if (!ownerA.ok || !ownerB.ok) return;

    const created = await createPrivatePlanForWorkspace(
      deps,
      adminUserId,
      ownerA.value.defaultWorkspaceId,
      draftPrivatePlanInput()
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const workspaceA = await deps.repos.workspace.findById(
      ownerA.value.defaultWorkspaceId
    );

    const crossAssign = await setWorkspacePlan(
      deps,
      adminUserId,
      ownerB.value.defaultWorkspaceId,
      workspaceA?.planId ?? ''
    );
    expect(crossAssign.ok).toBe(false);
    if (!crossAssign.ok)
      expect(crossAssign.error).toBe('plan_restricted_to_other_workspace');
  });

  test('atribuir o próprio plano privado cancela assinatura Stripe ativa', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const owner = await register(deps, {
      name: 'Dono Com Stripe Ativo',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    // Simula assinatura Stripe já ativa antes do vínculo do plano privado.
    await db
      .update(workspaces)
      .set({
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        subscriptionStatus: 'active',
      })
      .where(eq(workspaces.id, owner.value.defaultWorkspaceId));

    const created = await createPrivatePlanForWorkspace(
      deps,
      adminUserId,
      owner.value.defaultWorkspaceId,
      draftPrivatePlanInput()
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.value.subscriptionStatus).toBe('canceled');
    expect(created.value.stripeSubscriptionId).toBeNull();
  });

  test('createPrivatePlanForWorkspace cria e atribui atomicamente', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const owner = await register(deps, {
      name: 'Dono Plano Combinado',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;

    const result = await createPrivatePlanForWorkspace(
      deps,
      adminUserId,
      owner.value.defaultWorkspaceId,
      draftPrivatePlanInput(1)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const plan = await deps.repos.plan.findById(result.value.planId);
    expect(plan?.restrictedToWorkspaceId).toBe(owner.value.defaultWorkspaceId);
    expect(plan?.prices.length).toBe(1);
    expect(plan?.isActive).toBe(true);

    const auditRows = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.entityId, plan?.id ?? ''));
    expect(auditRows.some((r) => r.action === 'create_plan')).toBe(true);
    const workspaceAudit = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.entityId, owner.value.defaultWorkspaceId));
    expect(workspaceAudit.some((r) => r.action === 'set_workspace_plan')).toBe(
      true
    );
  });

  test('rejeita restringir plano já compartilhado por mais de um workspace', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const ownerA = await register(deps, {
      name: 'Compartilhado A',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    const ownerB = await register(deps, {
      name: 'Compartilhado B',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(ownerA.ok).toBe(true);
    expect(ownerB.ok).toBe(true);
    if (!ownerA.ok || !ownerB.ok) return;

    const shared = await createPlan(
      deps,
      adminUserId,
      draftPlanInput(uniquePlanKey())
    );
    expect(shared.ok).toBe(true);
    if (!shared.ok) return;

    await setWorkspacePlan(
      deps,
      adminUserId,
      ownerA.value.defaultWorkspaceId,
      shared.value.id
    );
    await setWorkspacePlan(
      deps,
      adminUserId,
      ownerB.value.defaultWorkspaceId,
      shared.value.id
    );

    const restrict = await updatePlan(deps, adminUserId, shared.value.id, {
      restrictedToWorkspaceId: ownerA.value.defaultWorkspaceId,
    });
    expect(restrict.ok).toBe(false);
    if (!restrict.ok)
      expect(restrict.error).toBe('plan_shared_cannot_restrict');
  });
});
