import { type Either, left, right } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import type { AccountError } from './errors';

/** Conta com transações não é deletável — arquiva (regra do spec). */
export async function deleteAccount(
  deps: UseCaseDeps,
  actor: Actor,
  accountId: string
): Promise<Either<AccountError, null>> {
  const existing = await deps.repos.account.findInWorkspace(
    actor.workspaceId,
    accountId
  );
  if (!existing) return left('account_not_found');

  const hasTransaction =
    await deps.repos.transaction.existsByAccount(accountId);
  if (hasTransaction) return left('account_has_transactions');

  await deps.uow.run(async (repos) => {
    await repos.account.delete(accountId);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'delete',
      entity: 'bank_account',
      entityId: accountId,
    });
  });
  return right(null);
}
