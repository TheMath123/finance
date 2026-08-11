import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AdminError } from './errors';

/** Nunca deleta uma flag de sistema (`isSystem`) — só o toggle `enabled` é editável. */
export async function deleteFeatureFlag(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  key: string
): Promise<Either<AdminError, void>> {
  const existing = await deps.repos.featureFlag.findByKey(key);
  if (!existing) return left('feature_flag_not_found');
  if (existing.isSystem) return left('cannot_delete_system_feature_flag');

  await deps.uow.run(async (repos) => {
    await repos.featureFlag.delete(key);
    await repos.adminAudit.record({
      adminUserId,
      action: 'delete_feature_flag',
      entity: 'feature_flag',
      entityId: key,
    });
  });
  return right(undefined);
}
