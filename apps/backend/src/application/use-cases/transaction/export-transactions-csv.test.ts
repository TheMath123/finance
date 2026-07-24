/** Teste de integração do export CSV (M2-11, portabilidade LGPD). */
import { beforeAll, describe, expect, test } from 'bun:test';
import {
  bankAccounts,
  banks,
  categories,
  createDb,
  type Db,
  DEFAULT_CATEGORIES,
  users,
  workspaceMembers,
  workspaces,
} from '@finance/db';
import { createTestDeps } from '../../../test/deps';
import type { Actor } from '../../deps';
import { createTransaction } from './create-transaction';
import { exportTransactionsCsv } from './export-transactions-csv';

let db: Db;

beforeAll(() => {
  db = createDb();
});

async function newWorkspace() {
  const deps = createTestDeps(db);
  const [user] = await db
    .insert(users)
    .values({
      name: 'Teste Export CSV',
      email: `export-csv-${crypto.randomUUID()}@test.local`,
      passwordHash: 'x',
      termsAcceptedAt: new Date(),
      termsVersion: 'test',
    })
    .returning();
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Export CSV', type: 'personal' })
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
  const [account, secondAccount] = await db
    .insert(bankAccounts)
    .values([
      {
        workspaceId: workspace.id,
        bankId: bank!.id,
        name: 'Conta',
        type: 'checking',
        initialBalance: 0,
      },
      {
        workspaceId: workspace.id,
        bankId: bank!.id,
        name: 'Poupança',
        type: 'savings',
        initialBalance: 0,
      },
    ])
    .returning();

  const actor: Actor = {
    userId: user.id,
    workspaceId: workspace.id,
    role: 'owner',
  };
  return {
    deps,
    actor,
    marketCategoryId,
    accountId: account!.id,
    secondAccountId: secondAccount!.id,
  };
}

describe('exportTransactionsCsv', () => {
  test('workspace sem transações devolve só o cabeçalho', async () => {
    const { deps, actor } = await newWorkspace();
    const csv = await exportTransactionsCsv(deps, actor);
    expect(csv.split('\r\n')).toHaveLength(1);
    expect(csv).toContain(
      'Data,Descrição,Valor,Tipo,Método,Categoria,Conta,Conta destino,Cartão,Parcela,Origem'
    );
  });

  test('inclui transação lançada, com nome de categoria e conta resolvidos', async () => {
    const { deps, actor, marketCategoryId, accountId } = await newWorkspace();
    const result = await createTransaction(deps, actor, {
      description: 'compra no mercado',
      amount: 5_000,
      type: 'expense',
      method: 'pix',
      date: '2026-07-10',
      categoryId: marketCategoryId,
      accountId,
    });
    expect(result.ok).toBe(true);

    const csv = await exportTransactionsCsv(deps, actor);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      '2026-07-10,compra no mercado,50.00,Despesa,Pix,Mercado,Conta,,,,App'
    );
  });

  test('transferência: conta de destino aparece na coluna própria (auditoria 2026-07-19)', async () => {
    const { deps, actor, marketCategoryId, accountId, secondAccountId } =
      await newWorkspace();
    const result = await createTransaction(deps, actor, {
      description: 'transferência entre contas',
      amount: 2_000,
      type: 'expense',
      method: 'transfer',
      date: '2026-07-11',
      categoryId: marketCategoryId,
      accountId,
      toAccountId: secondAccountId,
    });
    expect(result.ok).toBe(true);

    const csv = await exportTransactionsCsv(deps, actor);
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe(
      '2026-07-11,transferência entre contas,20.00,Despesa,Transferência,Mercado,Conta,Poupança,,,App'
    );
  });

  test('transação excluída (soft delete) não aparece no export', async () => {
    const { deps, actor, marketCategoryId, accountId } = await newWorkspace();
    const created = await createTransaction(deps, actor, {
      description: 'vai ser excluída',
      amount: 1_000,
      type: 'expense',
      method: 'pix',
      date: '2026-07-10',
      categoryId: marketCategoryId,
      accountId,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await deps.repos.transaction.softDelete(created.value[0]!.id);

    const csv = await exportTransactionsCsv(deps, actor);
    expect(csv.split('\r\n')).toHaveLength(1);
  });
});
