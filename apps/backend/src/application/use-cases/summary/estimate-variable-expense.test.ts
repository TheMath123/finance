/**
 * Testes da estimativa de gasto variável (M2-08) — média histórica dos
 * últimos 3 meses completos, excluindo parcelas e recorrências, com cache.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import {
  bankAccounts,
  banks,
  categories,
  createDb,
  type Db,
  DEFAULT_CATEGORIES,
  recurringTransactions,
  transactions,
  users,
  workspaceMembers,
  workspaces,
} from '@finance/db';
import { createTestDeps, getTestPlanId } from '../../../test/deps';
import type { Actor, UseCaseDeps } from '../../deps';
import { estimateVariableExpense } from './estimate-variable-expense';

let db: Db;

function monthsAgoDate(monthsAgo: number, day = 10): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Workspace isolado por teste — cada um tem sua própria chave de cache. */
async function newWorkspace(): Promise<{
  deps: UseCaseDeps;
  actor: Actor;
  marketCategoryId: string;
  accountId: string;
}> {
  const deps = createTestDeps(db);
  const [user] = await db
    .insert(users)
    .values({
      name: 'Teste Gasto Variável',
      email: `variable-expense-${crypto.randomUUID()}@test.local`,
      passwordHash: 'x',
      termsAcceptedAt: new Date(),
      termsVersion: 'test',
    })
    .returning();
  const planId = await getTestPlanId(db);
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Gasto Variável', type: 'personal', planId })
    .returning();
  if (!user || !workspace) throw new Error('setup falhou');
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: workspace.id, userId: user.id, role: 'owner' });

  const cats = await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((c) => ({
        workspaceId: workspace.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isFallback: c.isFallback ?? false,
      }))
    )
    .returning();
  const marketCategoryId = cats.find((c) => c.name === 'Mercado')!.id;

  const [bank] = await db
    .insert(banks)
    .values({ workspaceId: workspace.id, name: 'Inter', bankCode: 'inter' })
    .returning();
  const [account] = await db
    .insert(bankAccounts)
    .values({
      workspaceId: workspace.id,
      bankId: bank!.id,
      name: 'Conta',
      type: 'checking',
      initialBalance: 0,
    })
    .returning();

  return {
    deps,
    actor: { userId: user.id, workspaceId: workspace.id, role: 'owner' },
    marketCategoryId,
    accountId: account!.id,
  };
}

beforeAll(() => {
  db = createDb();
});

describe('estimateVariableExpense', () => {
  test('workspace sem histórico devolve zero', async () => {
    const { deps, actor } = await newWorkspace();
    const result = await estimateVariableExpense(deps, actor);
    expect(result.total).toBe(0);
    expect(result.byCategory).toEqual([]);
  });

  test('média dos últimos 3 meses, ignorando parcelas e recorrências', async () => {
    const { deps, actor, marketCategoryId, accountId } = await newWorkspace();

    // 3 meses de gasto variável: R$ 300 em cada um dos últimos 3 meses completos.
    for (let m = 1; m <= 3; m++) {
      await db.insert(transactions).values({
        workspaceId: actor.workspaceId,
        createdBy: actor.userId,
        description: 'mercado',
        descriptionNormalized: 'mercado',
        amount: 30_000,
        type: 'expense',
        method: 'pix',
        date: monthsAgoDate(m),
        categoryId: marketCategoryId,
        accountId,
      });
    }

    // Parcela — não é gasto "variável", tem que ficar fora da média.
    await db.insert(transactions).values({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: 'compra parcelada',
      descriptionNormalized: 'compra parcelada',
      amount: 900_000,
      type: 'expense',
      method: 'credit',
      date: monthsAgoDate(1),
      categoryId: marketCategoryId,
      installmentGroupId: crypto.randomUUID(),
      installmentNumber: 1,
      installmentTotal: 3,
    });

    // Recorrência — idem, já entra no disponível projetado por outro caminho.
    const [recurring] = await db
      .insert(recurringTransactions)
      .values({
        workspaceId: actor.workspaceId,
        description: 'assinatura',
        amount: 5_000,
        type: 'expense',
        method: 'pix',
        categoryId: marketCategoryId,
        accountId,
        frequency: 'monthly',
        dayOfReference: 10,
      })
      .returning();
    await db.insert(transactions).values({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: 'assinatura',
      descriptionNormalized: 'assinatura',
      amount: 5_000,
      type: 'expense',
      method: 'pix',
      date: monthsAgoDate(1),
      categoryId: marketCategoryId,
      accountId,
      recurringId: recurring!.id,
    });

    const result = await estimateVariableExpense(deps, actor);
    expect(result.total).toBe(30_000); // (30000+30000+30000)/3 — parcela e recorrência de fora
    expect(result.byCategory).toEqual([
      {
        categoryId: marketCategoryId,
        name: 'Mercado',
        color: expect.any(String),
        estimated: 30_000,
      },
    ]);
  });

  test('cache: segunda chamada não recalcula mesmo com novos lançamentos', async () => {
    const { deps, actor, marketCategoryId, accountId } = await newWorkspace();
    await db.insert(transactions).values({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: 'mercado',
      descriptionNormalized: 'mercado',
      amount: 30_000,
      type: 'expense',
      method: 'pix',
      date: monthsAgoDate(1),
      categoryId: marketCategoryId,
      accountId,
    });

    const first = await estimateVariableExpense(deps, actor);
    expect(first.total).toBe(10_000); // 30000/3

    // Um novo lançamento mudaria o resultado se a média fosse recalculada.
    await db.insert(transactions).values({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: 'mercado 2',
      descriptionNormalized: 'mercado 2',
      amount: 300_000,
      type: 'expense',
      method: 'pix',
      date: monthsAgoDate(1),
      categoryId: marketCategoryId,
      accountId,
    });

    const second = await estimateVariableExpense(deps, actor);
    expect(second).toEqual(first);
  });
});
