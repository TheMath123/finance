import type { UseCaseDeps } from '../../deps';

export async function deleteFeatureFlag(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  key: string
): Promise<void> {
  await deps.uow.run(async (repos) => {
    await repos.featureFlag.delete(key);
    await repos.adminAudit.record({
      adminUserId,
      action: 'delete_feature_flag',
      entity: 'feature_flag',
      entityId: key,
    });
  });
}
