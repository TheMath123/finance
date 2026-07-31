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
import { createSavedFormula } from '../saved-formula/create-saved-formula';
import { createWorkspace } from '../workspace/create-workspace';
import {
  activatePlan,
  addPlanPrice,
  confirmWorkspacePayment,
  createPlan,
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
