import { type Either, left, right } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import type { CardError } from './errors';

export async function deleteCard(
  deps: UseCaseDeps,
  actor: Actor,
  cardId: string
): Promise<Either<CardError, null>> {
  const existing = await deps.repos.card.findInWorkspace(
    actor.workspaceId,
    cardId
  );
  if (!existing) return left('card_not_found');

  const hasTransaction = await deps.repos.transaction.existsByCard(cardId);
  if (hasTransaction) return left('card_has_transactions');

  await deps.uow.run(async (repos) => {
    await repos.invoice.deleteByCard(cardId);
    await repos.card.delete(cardId);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'delete',
      entity: 'card',
      entityId: cardId,
    });
  });
  return right(null);
}
