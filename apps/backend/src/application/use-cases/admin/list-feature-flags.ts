import type { UseCaseDeps } from '../../deps';
import type { FeatureFlag } from '../../ports/feature-flag-repository';

export function listFeatureFlags(
  deps: Pick<UseCaseDeps, 'repos'>,
  search?: string
): Promise<FeatureFlag[]> {
  return deps.repos.featureFlag.list(search);
}
