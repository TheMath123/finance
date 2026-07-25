import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AdminError } from './errors';

export async function suspendUser(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  targetUserId: string
): Promise<Either<AdminError, void>> {
  if (adminUserId === targetUserId) return left('cannot_suspend_self');

  const user = await deps.repos.user.findById(targetUserId);
  if (!user) return left('user_not_found');

  await deps.uow.run(async (repos) => {
    await repos.user.suspend(targetUserId);
    await repos.adminAudit.record({
      adminUserId,
      action: 'suspend_user',
      entity: 'user',
      entityId: targetUserId,
    });
  });
  return right(undefined);
}
