import { type Either, left, right } from '@finance/shared';
import type { CardInvoice } from '../../../domain/entities/card';
import type { Transaction } from '../../../domain/entities/transaction';
import {
  addMonths,
  addMonthsToDate,
  type InvoicePeriod,
} from '../../../domain/services/invoice-rules';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { CardError } from './errors';

export interface ConfirmInvoiceCsvImportRowInput {
  /** Data já parseada (YYYY-MM-DD) da linha original do CSV — a competência real de cada parcela é derivada dela. */
  date: string;
  /** Sem o sufixo "NN/NN" — o preview já devolve limpa. */
  description: string;
  /** Centavos, com sinal (negativo = estorno/reembolso), igual ao preview. */
  amount: number;
  categoryId: string;
  /** Confirmação do usuário de que a linha É mesmo uma parcela — null trata como compra avulsa. */
  installment: { number: number; total: number } | null;
}

export interface ConfirmInvoiceCsvImportInput {
  cardId: string;
  month: number;
  year: number;
  rows: ConfirmInvoiceCsvImportRowInput[];
}

export interface ConfirmInvoiceCsvImportOutput {
  created: number;
  skippedDuplicates: number;
  /** Fatura futura tocada por forward-fill de parcela já estava paga — imutabilidade (nunca sobrescreve). */
  skippedPaidInvoice: number;
}

/**
 * Grava o lote confirmado pelo usuário. Cada linha marcada como parcela
 * forward-preenche as faturas futuras (mesma parcela desse ponto em diante —
 * não reconstrói o que veio antes, ver plano) reusando o mesmo valor da linha
 * importada. Dedup por fatura (data+descrição normalizada+valor) roda de novo
 * aqui — nunca confia cegamente na classificação do preview, que pode ter
 * ficado desatualizada entre as duas chamadas.
 */
export async function confirmInvoiceCsvImport(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  actor: Actor,
  input: ConfirmInvoiceCsvImportInput
): Promise<Either<CardError, ConfirmInvoiceCsvImportOutput>> {
  const card = await deps.repos.card.findActiveInWorkspace(
    actor.workspaceId,
    input.cardId
  );
  if (!card) return left('card_not_found');
  const cardId = card.id;

  const categoryIds = [...new Set(input.rows.map((r) => r.categoryId))];
  for (const categoryId of categoryIds) {
    const category = await deps.repos.category.findInWorkspace(
      actor.workspaceId,
      categoryId
    );
    if (!category) return left('category_not_found');
  }

  const targetPeriod: InvoicePeriod = { month: input.month, year: input.year };

  let created = 0;
  let skippedDuplicates = 0;
  let skippedPaidInvoice = 0;

  await deps.uow.run(async (repos) => {
    const invoiceCache = new Map<string, CardInvoice>();
    const existingCache = new Map<string, Transaction[]>();

    async function getInvoice(period: InvoicePeriod): Promise<CardInvoice> {
      const key = `${period.year}-${period.month}`;
      const cached = invoiceCache.get(key);
      if (cached) return cached;
      const invoice = await repos.invoice.getOrCreate(
        actor.workspaceId,
        cardId,
        period
      );
      invoiceCache.set(key, invoice);
      return invoice;
    }

    async function getExisting(invoiceId: string): Promise<Transaction[]> {
      const cached = existingCache.get(invoiceId);
      if (cached) return cached;
      const rows = await repos.transaction.listByInvoice(invoiceId);
      existingCache.set(invoiceId, rows);
      return rows;
    }

    for (const row of input.rows) {
      const descriptionNormalized = normalizeDescription(row.description);
      const type = row.amount < 0 ? 'income' : 'expense';
      const absoluteAmount = Math.abs(row.amount);
      const groupId = row.installment ? crypto.randomUUID() : null;
      const count = row.installment
        ? row.installment.total - row.installment.number + 1
        : 1;

      for (let i = 0; i < count; i++) {
        const period = addMonths(targetPeriod, i);
        const date = addMonthsToDate(row.date, i);
        const invoice = await getInvoice(period);

        if (invoice.status === 'paid') {
          skippedPaidInvoice++;
          continue;
        }

        const existingRows = await getExisting(invoice.id);
        const isDuplicate = existingRows.some(
          (t) =>
            t.date === date &&
            t.descriptionNormalized === descriptionNormalized &&
            t.amount === absoluteAmount
        );
        if (isDuplicate) {
          skippedDuplicates++;
          continue;
        }

        const createdRow = await repos.transaction.create({
          workspaceId: actor.workspaceId,
          createdBy: actor.userId,
          description: row.description,
          descriptionNormalized,
          amount: absoluteAmount,
          type,
          method: 'credit',
          date,
          categoryId: row.categoryId,
          cardId,
          invoiceId: invoice.id,
          installmentNumber: row.installment
            ? row.installment.number + i
            : null,
          installmentTotal: row.installment ? row.installment.total : null,
          installmentGroupId: groupId,
          source: 'app',
        });
        // Mantém o cache coerente pra próxima iteração (mesma fatura pode ser
        // tocada por outra linha do lote — ex. duas parcelas caindo no mesmo mês).
        existingRows.push(createdRow);

        await repos.audit.record({
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: 'create',
          entity: 'transaction',
          entityId: createdRow.id,
        });

        created++;
      }
    }
  });

  return right({ created, skippedDuplicates, skippedPaidInvoice });
}
