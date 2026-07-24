/**
 * Testes da Camada 0 do pipeline de IA (M2-07) contra o Postgres local.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { bankAccounts, banks, cards, createDb, type Db } from '@finance/db';
import { createTestDeps } from '../../../test/deps';
import type { Actor } from '../../deps';
import { register } from '../auth';
import { parseObviousTransaction } from './parse-obvious-transaction';

let db: Db;

beforeAll(() => {
  db = createDb();
});

async function newActorWithAccountAndCard() {
  const deps = createTestDeps(db);
  const result = await register(deps, {
    name: 'Teste Parser',
    email: `parser-${crypto.randomUUID()}@test.local`,
    password: 'senha-forte-123',
  });
  if (!result.ok) throw new Error('falha ao registrar usuário de teste');
  const actor: Actor = {
    userId: result.value.user.id,
    workspaceId: result.value.defaultWorkspaceId,
    role: 'owner',
  };

  const [bank] = await db
    .insert(banks)
    .values({
      workspaceId: actor.workspaceId,
      name: 'Banco Parser',
      bankCode: 'other',
    })
    .returning();
  const [account] = await db
    .insert(bankAccounts)
    .values({
      workspaceId: actor.workspaceId,
      bankId: bank!.id,
      name: 'Conta Corrente',
      type: 'checking',
      initialBalance: 0,
    })
    .returning();
  const [card] = await db
    .insert(cards)
    .values({
      workspaceId: actor.workspaceId,
      bankId: bank!.id,
      name: 'Nubank',
      limit: 100_000,
      closingDay: 5,
      dueDay: 15,
    })
    .returning();

  const categories = await db.query.categories.findMany({
    where: (c, { eq }) => eq(c.workspaceId, actor.workspaceId),
  });

  return {
    deps,
    actor,
    accountId: account!.id,
    cardId: card!.id,
    categoryId: categories[0]!.id,
  };
}

describe('parseObviousTransaction (Camada 0)', () => {
  test('sem cache de categorização, mesmo com conta reconhecida, cai pra Camada 1 (null)', async () => {
    const { deps, actor } = await newActorWithAccountAndCard();
    const result = await parseObviousTransaction(
      deps,
      actor.workspaceId,
      '50 mercado conta corrente'
    );
    expect(result).toBeNull();
  });

  test('sem menção a conta/cartão reconhecido, cai pra Camada 1 (null)', async () => {
    const { deps, actor } = await newActorWithAccountAndCard();
    const result = await parseObviousTransaction(
      deps,
      actor.workspaceId,
      '50 mercado qualquer coisa'
    );
    expect(result).toBeNull();
  });

  test('com cache de categorização e conta reconhecida, resolve a transação', async () => {
    const { deps, actor, accountId, categoryId } =
      await newActorWithAccountAndCard();

    // Popula o cache: uma transação anterior com a mesma descrição normalizada.
    await deps.repos.transaction.create({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: 'mercado',
      descriptionNormalized: 'mercado',
      amount: 3000,
      type: 'expense',
      method: 'pix',
      date: '2026-07-01',
      categoryId,
      accountId,
    });

    const result = await parseObviousTransaction(
      deps,
      actor.workspaceId,
      '50 mercado conta corrente'
    );
    expect(result).toEqual({
      description: 'mercado',
      amount: 5000,
      type: 'expense',
      method: 'pix',
      date: expect.any(String),
      categoryId,
      accountId,
      cardId: undefined,
    });
  });

  test('com cache de categorização e cartão reconhecido, resolve como crédito', async () => {
    const { deps, actor, cardId, categoryId } =
      await newActorWithAccountAndCard();

    await deps.repos.transaction.create({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: 'assinatura',
      descriptionNormalized: 'assinatura',
      amount: 2000,
      type: 'expense',
      method: 'credit',
      date: '2026-07-01',
      categoryId,
      cardId,
      invoiceId: undefined,
    });

    const result = await parseObviousTransaction(
      deps,
      actor.workspaceId,
      '20 assinatura nubank'
    );
    expect(result).toEqual({
      description: 'assinatura',
      amount: 2000,
      type: 'expense',
      method: 'credit',
      date: expect.any(String),
      categoryId,
      accountId: undefined,
      cardId,
    });
  });

  test('texto que não começa com valor cai pra Camada 1 (null)', async () => {
    const { deps, actor } = await newActorWithAccountAndCard();
    const result = await parseObviousTransaction(
      deps,
      actor.workspaceId,
      'gastei 50 no mercado'
    );
    expect(result).toBeNull();
  });
});
