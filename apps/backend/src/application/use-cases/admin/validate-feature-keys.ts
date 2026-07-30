import type { UseCaseDeps } from '../../deps';

/**
 * M5-03: unifica o vocabulário de `plans.features` com `feature_flags` (M4-09)
 * — só permite travar/liberar por plano uma feature que já existe cadastrada
 * como flag. Lista vazia é sempre válida (plano sem features exclusivas).
 */
export async function validateFeatureKeys(
  deps: Pick<UseCaseDeps, 'repos'>,
  keys: string[]
): Promise<boolean> {
  if (keys.length === 0) return true;
  const flags = await deps.repos.featureFlag.list();
  const known = new Set(flags.map((f) => f.key));
  return keys.every((key) => known.has(key));
}
