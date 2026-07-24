import { type Either, left, right } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import type { TransactionError } from './errors';

/** Restaura simetricamente ao delete: parcelada restaura todo o grupo excluído. */
export async function restoreTransaction(
  deps: UseCaseDeps,
  actor: Actor,
  id: string
): Promise<Either<TransactionError, { restoredIds: string[] }>> {
  const existing = await deps.repos.transaction.findInWorkspace(
    actor.workspaceId,
    id
  );
  if (!existing?.deletedAt) return left('transaction_not_found');

  const restoredIds = await deps.uow.run(async (repos) => {
    const group = existing.installmentGroupId
      ? await repos.transaction.listByGroup(existing.installmentGroupId)
      : [existing];
    const deletedTargets = group.filter((t) => t.deletedAt !== null);

    const ids: string[] = [];
    for (const t of deletedTargets) {
      await repos.transaction.restore(t.id);
      await repos.audit.record({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: 'restore',
        entity: 'transaction',
        entityId: t.id,
      });
      ids.push(t.id);
    }
    return ids;
  });
  return right({ restoredIds });
}
