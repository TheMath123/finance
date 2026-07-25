/**
 * Use-cases de plataforma do M4-09 (orçamento de IA, feature flags,
 * métricas) contra o Postgres local — mesmo padrão de admin.test.ts.
 *
 * `platform_settings` também é global/singleton (mesmo risco de
 * `default_categories` no M4-08): o teste captura o valor original e
 * restaura ao final, pra não deixar o resto da suíte com um orçamento
 * diferente do esperado. Métricas usam asserções de limite inferior
 * (`>=`), nunca igualdade exata, porque `users`/`workspaces`/
 * `transactions` são tabelas globais que outros arquivos de teste
 * também povoam em paralelo.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { adminAuditLogs, createDb, type Db } from '@finance/db';
import { eq } from 'drizzle-orm';
import { createTestDeps } from '../../../test/deps';
import { readDailyTokenBudget } from '../../services/ai-settings-cache';
import { isFeatureEnabled } from '../../services/feature-flags';
import { register } from '../auth';
import {
  deleteFeatureFlag,
  getAiSettings,
  getPlatformMetrics,
  listFeatureFlags,
  suspendUser,
  updateAiSettings,
  upsertFeatureFlag,
} from '.';

const uniqueEmail = () => `test-platform-${crypto.randomUUID()}@test.local`;
const uniqueFlagKey = () => `test-flag-${crypto.randomUUID().slice(0, 8)}`;

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

describe('admin: orçamento de IA', () => {
  test('atualizar reflete na hora via readDailyTokenBudget (write-through)', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const original = await getAiSettings(deps);

    try {
      const updated = await updateAiSettings(deps, adminUserId, {
        dailyTokenBudgetPerUser: 42_000,
      });
      expect(updated.dailyTokenBudgetPerUser).toBe(42_000);

      const readBack = await readDailyTokenBudget(deps);
      expect(readBack).toBe(42_000);

      const auditRows = await db
        .select()
        .from(adminAuditLogs)
        .where(eq(adminAuditLogs.entityId, updated.id));
      expect(auditRows.some((r) => r.action === 'update_ai_settings')).toBe(
        true
      );
    } finally {
      await updateAiSettings(deps, adminUserId, {
        dailyTokenBudgetPerUser: original.dailyTokenBudgetPerUser,
      });
    }
  });
});

describe('admin: feature flags', () => {
  test('upsert + isFeatureEnabled + delete', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);
    const key = uniqueFlagKey();

    expect(await isFeatureEnabled(deps, key)).toBe(false);

    const created = await upsertFeatureFlag(deps, adminUserId, key, {
      enabled: true,
      description: 'flag de teste',
    });
    expect(created.enabled).toBe(true);
    expect(await isFeatureEnabled(deps, key)).toBe(true);

    const updated = await upsertFeatureFlag(deps, adminUserId, key, {
      enabled: false,
    });
    expect(updated.enabled).toBe(false);
    expect(await isFeatureEnabled(deps, key)).toBe(false);

    const list = await listFeatureFlags(deps);
    expect(list.some((f) => f.key === key)).toBe(true);

    await deleteFeatureFlag(deps, adminUserId, key);
    expect(await isFeatureEnabled(deps, key)).toBe(false);

    const listAfterDelete = await listFeatureFlags(deps);
    expect(listAfterDelete.some((f) => f.key === key)).toBe(false);

    const auditRows = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.entityId, key));
    const actions = auditRows.map((r) => r.action);
    expect(actions).toContain('upsert_feature_flag');
    expect(actions).toContain('delete_feature_flag');
  });
});

describe('admin: métricas da plataforma', () => {
  test('agrega usuários/workspaces/transações (limite inferior — tabelas globais)', async () => {
    const deps = createTestDeps(db);
    const before = await getPlatformMetrics(deps);

    const email = uniqueEmail();
    const registered = await register(deps, {
      name: 'Metrics Test',
      email,
      password: 'senha-forte-123',
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    await suspendUser(
      deps,
      await registerAdmin(deps),
      registered.value.user.id
    );

    const after = await getPlatformMetrics(deps);
    expect(after.totalUsers).toBeGreaterThan(before.totalUsers);
    expect(after.suspendedUsers).toBeGreaterThan(before.suspendedUsers);
    expect(
      after.workspacesByPlan.find((w) => w.plan === 'free')?.count ?? 0
    ).toBeGreaterThan(0);
    expect(
      after.workspacesByType.find((w) => w.type === 'personal')?.count ?? 0
    ).toBeGreaterThan(0);
  });

  test('agrega uso de IA por camada dentro da janela de 30 dias', async () => {
    const deps = createTestDeps(db);
    const userId = await registerAdmin(deps);

    await deps.repos.aiUsageLog.record({
      userId,
      layer: 1,
      inputTokens: 100,
      outputTokens: 50,
    });
    await deps.repos.aiUsageLog.record({
      userId,
      layer: 2,
      inputTokens: 200,
      outputTokens: 80,
    });

    const since = new Date(Date.now() - 60_000);
    const aggregated = await deps.repos.aiUsageLog.aggregateByLayerSince(since);

    const layer1 = aggregated.find((a) => a.layer === 1);
    const layer2 = aggregated.find((a) => a.layer === 2);
    expect(layer1?.totalInputTokens).toBeGreaterThanOrEqual(100);
    expect(layer1?.totalOutputTokens).toBeGreaterThanOrEqual(50);
    expect(layer2?.totalInputTokens).toBeGreaterThanOrEqual(200);
    expect(layer2?.totalOutputTokens).toBeGreaterThanOrEqual(80);
  });
});
