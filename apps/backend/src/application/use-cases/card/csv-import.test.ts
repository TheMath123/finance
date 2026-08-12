/**
 * Testes de use-case do import de CSV de fatura (M6-01): preview (leitura
 * pura, classificação new/duplicate/invalid, sugestão de categoria) e
 * confirm (gravação, forward-fill de parcela, dedup real, imutabilidade de
 * fatura paga). Cobre também o "insight de auto-cura" do plano — reimportar
 * o mês seguinte de uma parcela já forward-preenchida encontra duplicata.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import {
  banks,
  cards,
  categories,
  createDb,
  type Db,
  DEFAULT_CATEGORIES,
  users,
  workspaceMembers,
  workspaces,
} from '@finance/db';
import { createTestDeps, getTestPlanId } from '../../../test/deps';
import type { Actor, UseCaseDeps } from '../../deps';
import { confirmInvoiceCsvImport } from './confirm-invoice-csv-import';
import { previewInvoiceCsvImport } from './preview-invoice-csv-import';

let db: Db;
let deps: UseCaseDeps;
let actor: Actor;
let cardId: string;
let categoryId: string;
let fallbackCategoryId: string;

function csv(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

beforeAll(async () => {
  db = createDb();
  deps = createTestDeps(db);
  const [user] = await db
    .insert(users)
    .values({
      name: 'Dono',
      email: `csv-import-${crypto.randomUUID()}@test.local`,
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

  const inserted = await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((c) => ({
        workspaceId: workspace.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isFallback: c.isFallback ?? false,
        isDefault: true,
      }))
    )
    .returning();
  categoryId = inserted.find((c) => c.name === 'Mercado')!.id;
  fallbackCategoryId = inserted.find((c) => c.isFallback)!.id;

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
      limit: 5_000_000,
      closingDay: 10,
      dueDay: 17,
    })
    .returning();
  if (!card) throw new Error('setup falhou');

  cardId = card.id;
  actor = { userId: user.id, workspaceId: workspace.id, role: 'owner' };
});

describe('previewInvoiceCsvImport', () => {
  test('cartão inexistente retorna card_not_found', async () => {
    const result = await previewInvoiceCsvImport(deps, actor, {
      cardId: crypto.randomUUID(),
      month: 3,
      year: 2040,
      buffer: csv('Data;Descrição;Valor\n15/03/2040;X;10,00'),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('card_not_found');
  });

  test('CSV vazio (sem linha de dado) retorna csv_empty', async () => {
    const result = await previewInvoiceCsvImport(deps, actor, {
      cardId,
      month: 3,
      year: 2040,
      buffer: csv('Data;Descrição;Valor\n'),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('csv_empty');
  });

  test('classifica linha nova, sugere categoria fallback e detecta parcela', async () => {
    const result = await previewInvoiceCsvImport(deps, actor, {
      cardId,
      month: 3,
      year: 2040,
      buffer: csv(
        'Data;Descrição;Valor\n01/03/2040;COMPRA LOJA X 03/12;299,90'
      ),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.headerDetected).toBe(true);
    expect(result.value.delimiter).toBe(';');
    expect(result.value.rows).toHaveLength(1);
    const row = result.value.rows[0]!;
    expect(row.status).toBe('new');
    expect(row.date).toBe('2040-03-01');
    expect(row.description).toBe('COMPRA LOJA X');
    expect(row.amount).toBe(29_990);
    expect(row.type).toBe('expense');
    expect(row.installment).toEqual({ number: 3, total: 12 });
    expect(row.suggestedCategoryId).toBe(fallbackCategoryId);
  });

  test('linha com data inválida é marcada invalid', async () => {
    const result = await previewInvoiceCsvImport(deps, actor, {
      cardId,
      month: 3,
      year: 2040,
      buffer: csv('Data;Descrição;Valor\n31/02/2040;MERCADO;50,00'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = result.value.rows[0]!;
    expect(row.status).toBe('invalid');
    expect(row.date).toBeNull();
  });

  test('linha que já existe na fatura alvo (mesma data+descrição+valor) é marcada duplicate', async () => {
    const invoice = await deps.repos.invoice.getOrCreate(
      actor.workspaceId,
      cardId,
      { month: 4, year: 2040 }
    );
    await deps.repos.transaction.create({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: 'MERCADO XYZ',
      descriptionNormalized: 'mercado xyz',
      amount: 15_000,
      type: 'expense',
      method: 'credit',
      date: '2040-04-15',
      categoryId,
      cardId,
      invoiceId: invoice.id,
    });

    const result = await previewInvoiceCsvImport(deps, actor, {
      cardId,
      month: 4,
      year: 2040,
      buffer: csv('Data;Descrição;Valor\n15/04/2040;MERCADO XYZ;150,00'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows[0]?.status).toBe('duplicate');
  });
});

describe('confirmInvoiceCsvImport', () => {
  test('cartão inexistente retorna card_not_found', async () => {
    const result = await confirmInvoiceCsvImport(deps, actor, {
      cardId: crypto.randomUUID(),
      month: 5,
      year: 2040,
      rows: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('card_not_found');
  });

  test('categoria inexistente retorna category_not_found sem criar nada', async () => {
    const result = await confirmInvoiceCsvImport(deps, actor, {
      cardId,
      month: 5,
      year: 2040,
      rows: [
        {
          date: '2040-05-01',
          description: 'ALGO',
          amount: 1000,
          categoryId: crypto.randomUUID(),
          installment: null,
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('category_not_found');
  });

  test('cria transação avulsa (sem parcela)', async () => {
    const result = await confirmInvoiceCsvImport(deps, actor, {
      cardId,
      month: 5,
      year: 2040,
      rows: [
        {
          date: '2040-05-02',
          description: 'PADARIA',
          amount: 2_500,
          categoryId,
          installment: null,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      created: 1,
      skippedDuplicates: 0,
      skippedPaidInvoice: 0,
    });

    const invoice = await deps.repos.invoice.findByCardAndPeriod(cardId, {
      month: 5,
      year: 2040,
    });
    expect(invoice).toBeDefined();
    const rows = await deps.repos.transaction.listByInvoice(invoice!.id);
    const created = rows.find((r) => r.descriptionNormalized === 'padaria');
    expect(created).toBeDefined();
    expect(created?.amount).toBe(2_500);
    expect(created?.type).toBe('expense');
    expect(created?.installmentGroupId).toBeNull();
  });

  test('reimportar a mesma linha pula como duplicata (nunca sobrescreve)', async () => {
    const result = await confirmInvoiceCsvImport(deps, actor, {
      cardId,
      month: 5,
      year: 2040,
      rows: [
        {
          date: '2040-05-02',
          description: 'PADARIA',
          amount: 2_500,
          categoryId,
          installment: null,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      created: 0,
      skippedDuplicates: 1,
      skippedPaidInvoice: 0,
    });
  });

  test('linha de parcela forward-preenche as faturas futuras com o mesmo installmentGroupId', async () => {
    const result = await confirmInvoiceCsvImport(deps, actor, {
      cardId,
      month: 5,
      year: 2040,
      rows: [
        {
          date: '2040-05-10',
          description: 'COMPRA GRANDE',
          amount: 30_000,
          categoryId,
          installment: { number: 1, total: 3 },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(3);

    const mayInvoice = await deps.repos.invoice.findByCardAndPeriod(cardId, {
      month: 5,
      year: 2040,
    });
    const mayRows = await deps.repos.transaction.listByInvoice(mayInvoice!.id);
    const created = mayRows.find(
      (r) => r.descriptionNormalized === 'compra grande'
    );
    expect(created).toBeDefined();
    expect(created?.installmentNumber).toBe(1);
    expect(created?.installmentTotal).toBe(3);
    expect(created?.installmentGroupId).not.toBeNull();

    const group = await deps.repos.transaction.listByGroup(
      created!.installmentGroupId!
    );
    expect(group).toHaveLength(3);
    expect(group.map((t) => t.installmentNumber)).toEqual([1, 2, 3]);
    expect(group.map((t) => t.date)).toEqual([
      '2040-05-10',
      '2040-06-10',
      '2040-07-10',
    ]);
    expect(group.every((t) => t.amount === 30_000)).toBe(true);

    // Auto-cura: reimportar o mês seguinte (junho) já encontra a parcela
    // forward-preenchida como duplicata no preview — sem lógica extra.
    const juneReimport = await previewInvoiceCsvImport(deps, actor, {
      cardId,
      month: 6,
      year: 2040,
      buffer: csv(
        'Data;Descrição;Valor\n10/06/2040;COMPRA GRANDE 02/03;300,00'
      ),
    });
    expect(juneReimport.ok).toBe(true);
    if (!juneReimport.ok) return;
    expect(juneReimport.value.rows[0]?.status).toBe('duplicate');
  });

  test('fatura já paga é pulada (imutabilidade), demais parcelas seguem normalmente', async () => {
    const paidInvoice = await deps.repos.invoice.getOrCreate(
      actor.workspaceId,
      cardId,
      { month: 8, year: 2040 }
    );
    await deps.repos.invoice.setStatus(paidInvoice.id, 'paid');

    const result = await confirmInvoiceCsvImport(deps, actor, {
      cardId,
      month: 8,
      year: 2040,
      rows: [
        {
          date: '2040-08-01',
          description: 'ASSINATURA',
          amount: 5_000,
          categoryId,
          installment: { number: 1, total: 2 },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(1);
    expect(result.value.skippedPaidInvoice).toBe(1);

    const septemberInvoice = await deps.repos.invoice.findByCardAndPeriod(
      cardId,
      { month: 9, year: 2040 }
    );
    expect(septemberInvoice).toBeDefined();
    const septemberRows = await deps.repos.transaction.listByInvoice(
      septemberInvoice!.id
    );
    expect(
      septemberRows.some((r) => r.descriptionNormalized === 'assinatura')
    ).toBe(true);
  });
});
