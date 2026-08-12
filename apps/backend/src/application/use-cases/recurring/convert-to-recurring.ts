import type { RecurrenceFrequency } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import type { Transaction } from '../../../domain/entities/transaction';
import type { Actor, UseCaseDeps } from '../../deps';
import { isInPaidInvoice } from '../transaction/helpers';
import type { RecurringError } from './errors';
import { validateRule } from './shared';

export interface ConvertToRecurringInput {
  transactionId: string;
  frequency: RecurrenceFrequency;
  dayOfReference: number;
  monthOfReference?: number;
}

/**
 * Transforma uma transação avulsa já existente na primeira ocorrência de
 * uma recorrência nova — não recria a transação (preserva id, auditoria,
 * anexo, splits), só cria o template e faz o patch de `recurringId`. A
 * constraint única `(recurring_id, date)` garante que essa mesma data
 * nunca é tocada de novo pelo sweep automático; as próximas ocorrências
 * são cuidadas por ele sozinho, sem lógica extra aqui.
 */
export async function convertToRecurring(
  deps: UseCaseDeps,
  actor: Actor,
  input: ConvertToRecurringInput
): Promise<Either<RecurringError, Transaction>> {
  const tx = await deps.repos.transaction.findInWorkspace(
    actor.workspaceId,
    input.transactionId
  );
  if (!tx || tx.deletedAt) return left('transaction_not_found');
  if (tx.recurringId) return left('already_recurring');
  if (tx.installmentGroupId) return left('installment_field_locked');
  if (tx.method === 'transfer') return left('invalid_method_fields');
  if (await isInPaidInvoice(deps.repos, tx)) return left('invoice_paid');

  if (
    !validateRule({
      frequency: input.frequency,
      dayOfReference: input.dayOfReference,
      monthOfReference: input.monthOfReference,
    })
  ) {
    return left('invalid_rule');
  }

  const updated = await deps.uow.run(async (repos) => {
    const rule = await repos.recurring.create(actor.workspaceId, {
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      method: tx.method as 'pix' | 'debit' | 'cash' | 'credit',
      categoryId: tx.categoryId,
      accountId: tx.accountId ?? undefined,
      cardId: tx.cardId ?? undefined,
      frequency: input.frequency,
      dayOfReference: input.dayOfReference,
      monthOfReference: input.monthOfReference,
      active: true,
    });
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'create',
      entity: 'recurring_transaction',
      entityId: rule.id,
    });

    const row = await repos.transaction.update(tx.id, {
      recurringId: rule.id,
    });
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
}
