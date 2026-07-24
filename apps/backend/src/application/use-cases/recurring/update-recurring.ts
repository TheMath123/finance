import { type Either, left, right } from '@finance/shared';
import type { RecurringTransaction } from '../../../domain/entities/recurring-transaction';
import type { Actor, UseCaseDeps } from '../../deps';
import type { CreateRecurringInput } from './create-recurring';
import type { RecurringError } from './errors';
import { validateRefs, validateRule } from './shared';

export async function updateRecurring(
  deps: UseCaseDeps,
  actor: Actor,
  recurringId: string,
  input: Partial<CreateRecurringInput>
): Promise<Either<RecurringError, RecurringTransaction>> {
  const existing = await deps.repos.recurring.findInWorkspace(
    actor.workspaceId,
    recurringId
  );
  if (!existing) return left('recurring_not_found');

  const merged = { ...existing, ...input };
  if (
    !validateRule({
      frequency: merged.frequency,
      dayOfReference: merged.dayOfReference,
      monthOfReference: merged.monthOfReference ?? undefined,
    })
  ) {
    return left('invalid_rule');
  }
  const refError = await validateRefs(deps.repos, actor.workspaceId, {
    method: merged.method as CreateRecurringInput['method'],
    categoryId: merged.categoryId,
    accountId: merged.accountId ?? undefined,
    cardId: merged.cardId ?? undefined,
  });
  if (refError) return left(refError);

  const updated = await deps.uow.run(async (repos) => {
    const row = await repos.recurring.update(recurringId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'update',
      entity: 'recurring_transaction',
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}
