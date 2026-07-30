/**
 * M5-02 — CRUD de planos, listagem de workspaces (dono + plano) e troca
 * manual de plano pelo superadmin, contra o Postgres local.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { adminAuditLogs, createDb, type Db } from '@finance/db';
import { eq } from 'drizzle-orm';
import { createTestDeps } from '../../../test/deps';
import { register } from '../auth';
import { createSavedFormula } from '../saved-formula/create-saved-formula';
import { createWorkspace } from '../workspace/create-workspace';
import {
  activatePlan,
  createPlan,
  deactivatePlan,
  listPlans,
  listWorkspaces,
  setWorkspacePlan,
  updatePlan,
} from '.';

const uniqueEmail = () => `test-plans-${crypto.randomUUID()}@test.local`;
const uniquePlanKey = () => `test-plan-${crypto.randomUUID().slice(0, 8)}`;

let db: Db;

beforeAll(() => {
  db = createDb();
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

function draftPlanInput(key: string, maxSavedFormulasPerWorkspace = 10) {
  return {
    key,
    name: 'Plano de Teste',
    priceCents: 1990,
    billingIntervalUnit: 'month' as const,
    billingIntervalCount: 1,
    limits: {
      maxOwnedSharedWorkspaces: 1,
      maxMembersPerWorkspace: 5,
      maxSavedFormulasPerWorkspace,
    },
    features: ['ai_chat'],
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

    const updated = await updatePlan(deps, adminUserId, created.value.id, {
      name: 'Plano Renomeado',
      priceCents: 2990,
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.name).toBe('Plano Renomeado');
      expect(updated.value.priceCents).toBe(2990);
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

    const { workspaces } = await listWorkspaces(deps, {
      limit: 100,
      offset: 0,
      search: 'Pessoal',
    });
    const found = workspaces.find((w) => w.ownerEmail === email.toLowerCase());
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
