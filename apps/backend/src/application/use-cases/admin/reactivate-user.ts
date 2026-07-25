import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AdminError } from './errors';

export async function reactivateUser(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  targetUserId: string
): Promise<Either<AdminError, void>> {
  const user = await deps.repos.user.findById(targetUserId);
  if (!user) return left('user_not_found');

  await deps.uow.run(async (repos) => {
    await repos.user.reactivate(targetUserId);
    await repos.adminAudit.record({
      adminUserId,
      action: 'reactivate_user',
      entity: 'user',
      entityId: targetUserId,
    });
  });
  return right(undefined);
}
