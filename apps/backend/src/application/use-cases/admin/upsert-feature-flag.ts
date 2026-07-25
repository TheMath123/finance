import type { UseCaseDeps } from '../../deps';
import type {
  FeatureFlag,
  FeatureFlagInput,
} from '../../ports/feature-flag-repository';

export async function upsertFeatureFlag(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  key: string,
  input: FeatureFlagInput
): Promise<FeatureFlag> {
  return deps.uow.run(async (repos) => {
    const flag = await repos.featureFlag.upsert(key, input);
    await repos.adminAudit.record({
      adminUserId,
      action: 'upsert_feature_flag',
      entity: 'feature_flag',
      entityId: key,
      metadata: { enabled: input.enabled },
    });
    return flag;
  });
}
