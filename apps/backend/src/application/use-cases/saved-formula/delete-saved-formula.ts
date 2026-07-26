import { type Either, left, right } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import type { SavedFormulaError } from './errors';

export async function deleteSavedFormula(
  deps: UseCaseDeps,
  actor: Actor,
  formulaId: string
): Promise<Either<SavedFormulaError, void>> {
  const existing = await deps.repos.savedFormula.findInWorkspace(
    actor.workspaceId,
    formulaId
  );
  if (!existing) return left('formula_not_found');

  await deps.uow.run(async (repos) => {
    await repos.savedFormula.delete(formulaId);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'delete',
      entity: 'saved_formula',
      entityId: formulaId,
    });
  });
  return right(undefined);
}
