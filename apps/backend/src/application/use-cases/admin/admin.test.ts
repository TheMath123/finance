/**
 * Use-cases de admin (M4-08) contra o Postgres local — mesmo padrão de
 * auth.test.ts/guards.test.ts. Testes de categoria padrão tomam cuidado
 * pra não deixar a tabela `default_categories` (global, compartilhada por
 * todo o resto da suíte) sem uma linha `isFallback: true` ao final.
 */

import { beforeAll, describe, expect, test } from 'bun:test';
import { adminAuditLogs, createDb, type Db } from '@finance/db';
import { eq } from 'drizzle-orm';
import { createTestDeps } from '../../../test/deps';
import { login, register } from '../auth';
import {
  createDefaultCategory,
  deleteDefaultCategory,
  listDefaultCategories,
  listUsers,
  reactivateUser,
  suspendUser,
  updateDefaultCategory,
} from '.';

const uniqueEmail = () => `test-admin-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

/** `admin_audit_logs.admin_user_id` tem FK pra `users` — precisa de um usuário real. */
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

describe('admin: suspensão de usuário', () => {
  test('suspende, bloqueia login, e reativa', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const password = 'senha-forte-123';
    const registered = await register(deps, { name: 'Alvo', email, password });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    const targetUserId = registered.value.user.id;

    const adminUserId = await registerAdmin(deps);
    const suspended = await suspendUser(deps, adminUserId, targetUserId);
    expect(suspended.ok).toBe(true);

    const blockedLogin = await login(deps, { email, password });
    expect(blockedLogin.ok).toBe(false);
    if (blockedLogin.ok) return;
    expect(blockedLogin.error).toBe('account_suspended');

    const auditRows = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.entityId, targetUserId));
    expect(auditRows.some((r) => r.action === 'suspend_user')).toBe(true);

    const reactivated = await reactivateUser(deps, adminUserId, targetUserId);
    expect(reactivated.ok).toBe(true);

    const allowedLogin = await login(deps, { email, password });
    expect(allowedLogin.ok).toBe(true);
  });

  test('não permite suspender a própria conta', async () => {
    const deps = createTestDeps(db);
    const result = await suspendUser(deps, 'mesmo-id', 'mesmo-id');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('cannot_suspend_self');
  });

  test('listUsers encontra por busca de nome/e-mail', async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const registered = await register(deps, {
      name: 'Fulano Buscavel',
      email,
      password: 'senha-forte-123',
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const output = await listUsers(deps, {
      search: 'Buscavel',
      limit: 20,
      offset: 0,
    });
    expect(output.users.some((u) => u.id === registered.value.user.id)).toBe(
      true
    );
    expect(output.users.every((u) => !('passwordHash' in u))).toBe(true);
  });
});

describe('admin: categorias padrão do seed', () => {
  test('CRUD grava em admin_audit_logs, sem mexer no fallback', async () => {
    const deps = createTestDeps(db);
    const adminUserId = await registerAdmin(deps);

    const created = await createDefaultCategory(deps, adminUserId, {
      name: `Teste ${crypto.randomUUID()}`,
      icon: 'test-icon',
      color: '#123456',
      isFallback: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updateDefaultCategory(
      deps,
      adminUserId,
      created.value.id,
      {
        color: '#654321',
      }
    );
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.value.color).toBe('#654321');

    const removed = await deleteDefaultCategory(
      deps,
      adminUserId,
      created.value.id
    );
    expect(removed.ok).toBe(true);

    const auditRows = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.entityId, created.value.id));
    const actions = auditRows.map((r) => r.action);
    expect(actions).toContain('create_default_category');
    expect(actions).toContain('update_default_category');
    expect(actions).toContain('delete_default_category');
  });

  test('não deixa excluir a categoria fallback atual', async () => {
    const deps = createTestDeps(db);
    const list = await listDefaultCategories(deps);
    const fallback = list.find((c) => c.isFallback);
    expect(fallback).toBeTruthy();
    if (!fallback) return;

    const result = await deleteDefaultCategory(
      deps,
      crypto.randomUUID(),
      fallback.id
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('cannot_delete_fallback_category');
  });

  // A troca de fallback (criar/editar com isFallback:true desmarca o anterior)
  // não tem teste automatizado aqui de propósito: `default_categories` é uma
  // tabela global compartilhada por toda a suíte, sem isolamento por
  // transação — qualquer teste que troque a fallback fica visível pra outros
  // arquivos de teste rodando em paralelo (foi reproduzido: um teste do
  // WhatsApp que espera "outros" na resposta pegou a fallback temporária no
  // meio da troca). Validado manualmente via smoke test (ver task doc).
});
