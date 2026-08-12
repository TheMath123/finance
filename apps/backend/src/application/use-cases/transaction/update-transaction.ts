import { type Either, left, right } from '@finance/shared';
import type { Transaction } from '../../../domain/entities/transaction';
import { competencePeriod } from '../../../domain/services/invoice-rules';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { TransactionPatch } from '../../ports/transaction-repository';
import type { TransactionError } from './errors';
import { isInPaidInvoice } from './helpers';

export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  categoryId?: string;
  date?: string;
  /** Só method pix/debit/cash (não credit, não transfer — duas pernas fica fora de escopo). */
  accountId?: string;
  /** Só method credit e transação avulsa (parcela mantém o cartão travado). */
  cardId?: string;
}

export async function updateTransaction(
  deps: UseCaseDeps,
  actor: Actor,
  id: string,
  input: UpdateTransactionInput
): Promise<Either<TransactionError, Transaction>> {
  const existing = await deps.repos.transaction.findInWorkspace(
    actor.workspaceId,
    id
  );
  if (!existing || existing.deletedAt) return left('transaction_not_found');
  if (await isInPaidInvoice(deps.repos, existing)) return left('invoice_paid');

  // Parcelas: valor, data e cartão são travados (mudaria a soma do grupo/fatura); descrição/categoria ok
  if (
    existing.installmentGroupId &&
    (input.amount !== undefined ||
      input.date !== undefined ||
      input.cardId !== undefined)
  ) {
    return left('installment_field_locked');
  }

  if (input.categoryId) {
    const category = await deps.repos.category.findInWorkspace(
      actor.workspaceId,
      input.categoryId
    );
    if (!category) return left('category_not_found');
  }

  if (input.accountId !== undefined) {
    if (existing.method === 'credit' || existing.method === 'transfer')
      return left('invalid_method_fields');
    const account = await deps.repos.account.findActiveInWorkspace(
      actor.workspaceId,
      input.accountId
    );
    if (!account) return left('account_not_found');
  }

  if (input.cardId !== undefined && existing.method !== 'credit')
    return left('invalid_method_fields');

  const patch: TransactionPatch = {};
  if (input.description !== undefined) {
    patch.description = input.description;
    patch.descriptionNormalized = normalizeDescription(input.description);
  }
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
  if (input.date !== undefined) patch.date = input.date;
  if (input.accountId !== undefined) patch.accountId = input.accountId;

  // Crédito com mudança de cartão e/ou data: recalcula a fatura de competência
  // no cartão de destino (mesmo cartão, se só a data mudou).
  const cardChanged =
    input.cardId !== undefined && input.cardId !== existing.cardId;
  if (
    existing.method === 'credit' &&
    (input.date !== undefined || cardChanged)
  ) {
    const targetCardId = input.cardId ?? existing.cardId!;
    const card = await deps.repos.card.findActiveInWorkspace(
      actor.workspaceId,
      targetCardId
    );
    if (!card) return left('card_not_found');
    const targetDate = input.date ?? existing.date;
    const invoice = await deps.repos.invoice.getOrCreate(
      actor.workspaceId,
      card.id,
      competencePeriod(targetDate, card.closingDay)
    );
    if (invoice.status === 'paid') return left('invoice_paid');
    patch.cardId = card.id;
    patch.invoiceId = invoice.id;
  }

  try {
    const updated = await deps.uow.run(async (repos) => {
      // Auditoria (2026-07-19): re-checa dentro da transação — a fatura pode ter
      // sido paga entre o check acima e este ponto.
      if (await isInPaidInvoice(repos, existing))
        throw new InvoiceNowPaidError();

      // Parcelas: description/categoryId propagam pra todo o grupo numa única
      // query (sem loop por parcela) — a mesma query já exclui parcelas em
      // faturas pagas, então não precisa checar de novo linha a linha.
      if (existing.installmentGroupId) {
        const rows = await repos.transaction.updateGroupFields(
          existing.installmentGroupId,
          patch
        );
        const row = rows.find((r) => r.id === existing.id);
        if (!row) throw new InvoiceNowPaidError();
        await repos.audit.record({
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: 'update',
          entity: 'transaction',
          entityId: row.id,
        });
        return row;
      }

      const row = await repos.transaction.update(existing.id, patch);
      await repos.audit.record({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: 'update',
        entity: 'transaction',
        entityId: row.id,
      });
      return row;
    });
    return right(updated);
  } catch (error) {
    if (error instanceof InvoiceNowPaidError) return left('invoice_paid');
    throw error;
  }
}

class InvoiceNowPaidError extends Error {}
