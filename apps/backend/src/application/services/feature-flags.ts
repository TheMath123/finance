import type { UseCaseDeps } from '../deps';

/**
 * Helper pra qualquer use-case futuro gatear comportamento por flag (M4-09)
 * — nenhum consumidor real ainda, só a infraestrutura. Sem cache de
 * propósito: se algum dia isto entrar num caminho quente (tipo o pipeline
 * de IA), reavaliar com o mesmo padrão de `ai-settings-cache.ts`.
 */
export async function isFeatureEnabled(
  deps: Pick<UseCaseDeps, 'repos'>,
  key: string
): Promise<boolean> {
  const flag = await deps.repos.featureFlag.findByKey(key);
  return flag?.enabled ?? false;
}
