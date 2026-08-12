import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type {
  FeatureFlag,
  FeatureFlagInput,
} from '../../ports/feature-flag-repository';
import type { AdminError } from './errors';

/**
 * Nunca cria flag nova — só atualiza uma já existente (seedada via migration).
 * Feature flags são definidas em código; o painel admin só liga/desliga o
 * que já existe no banco.
 */
export async function updateFeatureFlag(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  key: string,
  input: FeatureFlagInput
): Promise<Either<AdminError, FeatureFlag>> {
  const existing = await deps.repos.featureFlag.findByKey(key);
  if (!existing) return left('feature_flag_not_found');

  const flag = await deps.uow.run(async (repos) => {
    const updated = await repos.featureFlag.upsert(key, input);
    await repos.adminAudit.record({
      adminUserId,
      action: 'update_feature_flag',
      entity: 'feature_flag',
      entityId: key,
      metadata: { enabled: input.enabled },
    });
    return updated;
  });
  return right(flag);
}
