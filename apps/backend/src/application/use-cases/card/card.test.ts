/**
 * Testes de listagem de faturas: paginação, filtro por competência (mês/ano)
 * e destaque ("current" — fatura não paga mais antiga), independentes de
 * página/filtro (auditoria 2026-08-11, tela de faturas do dashboard).
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import {
  banks,
  cards,
  createDb,
  type Db,
  users,
  workspaceMembers,
  workspaces,
} from '@finance/db';
import { createTestDeps, getTestPlanId } from '../../../test/deps';
import type { Actor, UseCaseDeps } from '../../deps';
import { listInvoices } from './list-invoices';

let db: Db;
let deps: UseCaseDeps;
let actor: Actor;
let cardId: string;

beforeAll(async () => {
  db = createDb();
  deps = createTestDeps(db);
  const [user] = await db
    .insert(users)
    .values({
      name: 'Dono',
      email: `card-test-${crypto.randomUUID()}@test.local`,
      passwordHash: 'x',
      termsAcceptedAt: new Date(),
      termsVersion: 'test',
    })
    .returning();
  const planId = await getTestPlanId(db);
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Domínio', type: 'personal', planId })
    .returning();
  if (!user || !workspace) throw new Error('setup falhou');
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: workspace.id, userId: user.id, role: 'owner' });

  const [bank] = await db
    .insert(banks)
    .values({ workspaceId: workspace.id, name: 'Nubank', bankCode: 'nubank' })
    .returning();
  const [card] = await db
    .insert(cards)
    .values({
      workspaceId: workspace.id,
      bankId: bank!.id,
      name: 'Ultravioleta',
      limit: 500_000,
      closingDay: 10,
      dueDay: 17,
    })
    .returning();
  if (!card) throw new Error('setup falhou');

  cardId = card.id;
  actor = { userId: user.id, workspaceId: workspace.id, role: 'owner' };
});

describe('listInvoices — paginação, filtro por competência e destaque', () => {
  test('pagina o histórico (limit/offset) e conta o total', async () => {
    for (let month = 1; month <= 8; month++) {
      await deps.repos.invoice.getOrCreate(actor.workspaceId, cardId, {
        month,
        year: 2040,
      });
    }

    const firstPage = await listInvoices(deps, actor, cardId, {
      limit: 3,
      offset: 0,
      year: 2040,
    });
    expect(firstPage.ok).toBe(true);
    if (!firstPage.ok) return;
    expect(firstPage.value.total).toBe(8);
    expect(firstPage.value.invoices).toHaveLength(3);
    // Ordenado desc — página 1 traz os meses mais recentes primeiro.
    expect(firstPage.value.invoices.map((i) => i.monthReference)).toEqual([
      8, 7, 6,
    ]);

    const secondPage = await listInvoices(deps, actor, cardId, {
      limit: 3,
      offset: 3,
      year: 2040,
    });
    expect(secondPage.ok).toBe(true);
    if (!secondPage.ok) return;
    expect(secondPage.value.invoices.map((i) => i.monthReference)).toEqual([
      5, 4, 3,
    ]);
  });

  test('filtra por mês/ano exato', async () => {
    const result = await listInvoices(deps, actor, cardId, {
      month: 5,
      year: 2040,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(1);
    expect(result.value.invoices).toHaveLength(1);
    expect(result.value.invoices[0]?.monthReference).toBe(5);
  });

  test('destaque ("current") é a fatura não paga mais antiga, independente de página/filtro', async () => {
    const { invoices: january } = await deps.repos.invoice.listByCardPaginated(
      cardId,
      { month: 1, year: 2040 }
    );
    const target = january[0];
    if (!target) throw new Error('fatura de referência não encontrada');
    await deps.repos.invoice.setStatus(target.id, 'paid');

    const result = await listInvoices(deps, actor, cardId, {
      // filtrado numa página que não contém a fatura de destaque —
      // "current" tem que aparecer de qualquer forma.
      month: 8,
      year: 2040,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.current).not.toBeNull();
    // Jan/2040 foi marcada paga acima — a mais antiga não paga agora é fev/2040.
    expect(result.value.current?.monthReference).toBe(2);
    expect(result.value.current?.yearReference).toBe(2040);
  });

  test('sem faturas não pagas, "current" é null', async () => {
    for (let month = 1; month <= 8; month++) {
      const invoice = await deps.repos.invoice.getOrCreate(
        actor.workspaceId,
        cardId,
        { month, year: 2040 }
      );
      await deps.repos.invoice.setStatus(invoice.id, 'paid');
    }

    const result = await listInvoices(deps, actor, cardId, {
      year: 2040,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.current).toBeNull();
  });

  test('cartão inexistente retorna card_not_found', async () => {
    const result = await listInvoices(deps, actor, crypto.randomUUID());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('card_not_found');
  });
});
