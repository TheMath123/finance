/**
 * Guard de superadmin (M4-07) contra o Postgres local (docker compose) —
 * mesmo padrão de auth.test.ts.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { adminAuditLogs, createDb, type Db, users } from '@finance/db';
import { eq } from 'drizzle-orm';
import { register } from '../application/use-cases/auth';
import { createTestDeps } from '../test/deps';
import { requireSuperadmin } from './guards';

const uniqueEmail = () => `test-guard-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

function bearerRequest(token: string) {
  return new Request('http://test.local/admin', {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe('requireSuperadmin', () => {
  test('rejeita (403) usuário comum', async () => {
    const deps = createTestDeps(db);
    const result = await register(deps, {
      name: 'Usuário Comum',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const auth = await requireSuperadmin(
      deps,
      bearerRequest(result.value.accessToken)
    );
    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.error.status).toBe(403);
  });

  test('libera acesso e registra em admin_audit_logs após promoção manual', async () => {
    const deps = createTestDeps(db);
    const result = await register(deps, {
      name: 'Futuro Superadmin',
      email: uniqueEmail(),
      password: 'senha-forte-123',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const userId = result.value.user.id;

    // Promoção só acontece manualmente no banco — nunca via API (spec).
    await db
      .update(users)
      .set({ platformRole: 'superadmin' })
      .where(eq(users.id, userId));

    const auth = await requireSuperadmin(
      deps,
      bearerRequest(result.value.accessToken)
    );
    expect(auth.ok).toBe(true);
    if (!auth.ok) return;
    expect(auth.value.userId).toBe(userId);

    await deps.repos.adminAudit.record({
      adminUserId: userId,
      action: 'test_action',
      entity: 'test_entity',
      entityId: 'test-id',
    });

    const rows = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.adminUserId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('test_action');
    expect(rows[0]?.entity).toBe('test_entity');
  });
});
