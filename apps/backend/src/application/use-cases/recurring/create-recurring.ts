import type { RecurrenceFrequency, TransactionType } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import type { RecurringTransaction } from '../../../domain/entities/recurring-transaction';
import type { Actor, UseCaseDeps } from '../../deps';
import type { RecurringError } from './errors';
import { validateRefs, validateRule } from './shared';

export interface CreateRecurringInput {
  description: string;
  amount: number;
  type: TransactionType;
  /** Transferência recorrente fica fora do M1 (schema não tem conta destino). */
  method: 'pix' | 'debit' | 'cash' | 'credit';
  categoryId: string;
  accountId?: string;
  cardId?: string;
  frequency: RecurrenceFrequency;
  dayOfReference: number;
  monthOfReference?: number;
  active?: boolean;
}

export async function createRecurring(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateRecurringInput
): Promise<Either<RecurringError, RecurringTransaction>> {
  if (!validateRule(input)) return left('invalid_rule');
  const refError = await validateRefs(deps.repos, actor.workspaceId, input);
  if (refError) return left(refError);

  const created = await deps.uow.run(async (repos) => {
    const row = await repos.recurring.create(actor.workspaceId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'create',
      entity: 'recurring_transaction',
      entityId: row.id,
    });
    return row;
  });
  return right(created);
}
