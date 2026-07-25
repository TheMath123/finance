import type { UseCaseDeps } from '../../deps';
import type { AiSettings } from '../../ports/ai-settings-repository';

export function getAiSettings(
  deps: Pick<UseCaseDeps, 'repos'>
): Promise<AiSettings> {
  return deps.repos.aiSettings.get();
}
