import type { SavedFormula } from '../../../domain/entities/saved-formula';
import type { Actor, UseCaseDeps } from '../../deps';

export async function listSavedFormulas(
  deps: UseCaseDeps,
  actor: Actor
): Promise<SavedFormula[]> {
  return deps.repos.savedFormula.listByWorkspace(actor.workspaceId);
}
