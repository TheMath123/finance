/**
 * Testes de use-case do import de CSV direto pra conta (extrato bancário):
 * preview (leitura pura, classificação new/duplicate/invalid, convenção de
 * sinal invertida da fatura de cartão, sugestão de categoria) e confirm
 * (gravação com método fixo, dedup real, sem fatura/parcela).
 */
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
import { createTestDeps, getTestPlanId } from '../../../test/deps';
import type { Actor, UseCaseDeps } from '../../deps';
import { confirmAccountCsvImport } from './confirm-account-csv-import';
import { previewAccountCsvImport } from './preview-account-csv-import';

let db: Db;
let deps: UseCaseDeps;
let actor: Actor;
let accountId: string;
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
      email: `account-csv-import-${crypto.randomUUID()}@test.local`,
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
  const [account] = await db
    .insert(bankAccounts)
    .values({
      workspaceId: workspace.id,
      bankId: bank!.id,
      name: 'Principal',
      type: 'checking',
      initialBalance: 0,
    })
    .returning();
  if (!account) throw new Error('setup falhou');

  accountId = account.id;
  actor = { userId: user.id, workspaceId: workspace.id, role: 'owner' };
});

describe('previewAccountCsvImport', () => {
  test('conta inexistente retorna account_not_found', async () => {
    const result = await previewAccountCsvImport(deps, actor, {
      accountId: crypto.randomUUID(),
      buffer: csv('Data;Descrição;Valor\n15/03/2040;X;10,00'),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('account_not_found');
  });

  test('CSV vazio (sem linha de dado) retorna csv_empty', async () => {
    const result = await previewAccountCsvImport(deps, actor, {
      accountId,
      buffer: csv('Data;Descrição;Valor\n'),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('csv_empty');
  });

  test('valor positivo classifica como income (entrada) — convenção invertida da fatura', async () => {
    const result = await previewAccountCsvImport(deps, actor, {
      accountId,
      buffer: csv('Data;Descrição;Valor\n01/03/2040;PIX RECEBIDO;500,00'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = result.value.rows[0]!;
    expect(row.status).toBe('new');
    expect(row.type).toBe('income');
    expect(row.amount).toBe(50_000);
    expect(row.suggestedCategoryId).toBe(fallbackCategoryId);
  });

  test('valor negativo classifica como expense (saída)', async () => {
    const result = await previewAccountCsvImport(deps, actor, {
      accountId,
      buffer: csv('Data;Descrição;Valor\n01/03/2040;COMPRA MERCADO;-150,00'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = result.value.rows[0]!;
    expect(row.type).toBe('expense');
    expect(row.amount).toBe(-15_000);
  });

  test('linha com data inválida é marcada invalid', async () => {
    const result = await previewAccountCsvImport(deps, actor, {
      accountId,
      buffer: csv('Data;Descrição;Valor\n31/02/2040;MERCADO;-50,00'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = result.value.rows[0]!;
    expect(row.status).toBe('invalid');
    expect(row.date).toBeNull();
  });

  test('linha que já existe na conta no intervalo do arquivo é marcada duplicate', async () => {
    await deps.repos.transaction.create({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: 'MERCADO XYZ',
      descriptionNormalized: 'mercado xyz',
      amount: 15_000,
      type: 'expense',
      method: 'debit',
      date: '2040-04-15',
      categoryId,
      accountId,
    });

    const result = await previewAccountCsvImport(deps, actor, {
      accountId,
      buffer: csv('Data;Descrição;Valor\n15/04/2040;MERCADO XYZ;-150,00'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows[0]?.status).toBe('duplicate');
  });
});

describe('confirmAccountCsvImport', () => {
  test('conta inexistente retorna account_not_found', async () => {
    const result = await confirmAccountCsvImport(deps, actor, {
      accountId: crypto.randomUUID(),
      method: 'pix',
      rows: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('account_not_found');
  });

  test('categoria inexistente retorna category_not_found sem criar nada', async () => {
    const result = await confirmAccountCsvImport(deps, actor, {
      accountId,
      method: 'pix',
      rows: [
        {
          date: '2040-05-01',
          description: 'ALGO',
          amount: -1000,
          categoryId: crypto.randomUUID(),
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('category_not_found');
  });

  test('cria transação com método fixo e sem parcela/fatura', async () => {
    const result = await confirmAccountCsvImport(deps, actor, {
      accountId,
      method: 'pix',
      rows: [
        {
          date: '2040-05-02',
          description: 'PADARIA',
          amount: -2_500,
          categoryId,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ created: 1, skippedDuplicates: 0 });

    const rows = await deps.repos.transaction.listByAccountAndPeriod(
      accountId,
      '2040-05-01',
      '2040-05-31'
    );
    const created = rows.find((r) => r.descriptionNormalized === 'padaria');
    expect(created).toBeDefined();
    expect(created?.amount).toBe(2_500);
    expect(created?.type).toBe('expense');
    expect(created?.method).toBe('pix');
    expect(created?.cardId).toBeNull();
    expect(created?.invoiceId).toBeNull();
    expect(created?.installmentGroupId).toBeNull();
  });

  test('reimportar a mesma linha pula como duplicata (nunca sobrescreve)', async () => {
    const result = await confirmAccountCsvImport(deps, actor, {
      accountId,
      method: 'pix',
      rows: [
        {
          date: '2040-05-02',
          description: 'PADARIA',
          amount: -2_500,
          categoryId,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ created: 0, skippedDuplicates: 1 });
  });

  test('lote com datas em meses diferentes cria todas as linhas corretamente', async () => {
    const result = await confirmAccountCsvImport(deps, actor, {
      accountId,
      method: 'debit',
      rows: [
        {
          date: '2040-06-01',
          description: 'ENTRADA',
          amount: 1_000,
          categoryId,
        },
        {
          date: '2040-07-01',
          description: 'SAIDA',
          amount: -1_000,
          categoryId,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(2);

    const rows = await deps.repos.transaction.listByAccountAndPeriod(
      accountId,
      '2040-06-01',
      '2040-07-31'
    );
    const entrada = rows.find((r) => r.descriptionNormalized === 'entrada');
    const saida = rows.find((r) => r.descriptionNormalized === 'saida');
    expect(entrada?.type).toBe('income');
    expect(saida?.type).toBe('expense');
    expect(entrada?.method).toBe('debit');
  });
});
