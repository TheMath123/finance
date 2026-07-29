import { type Either, left, right } from '@finance/shared';
import type { SavedFormula } from '../../../domain/entities/saved-formula';
import type { Actor, UseCaseDeps } from '../../deps';
import type { SavedFormulaPatch } from '../../ports/saved-formula-repository';
import type { SavedFormulaError } from './errors';

export type ReorderField = 'home' | 'transactions';

/**
 * Reordena os widgets fixados (drag-and-drop no dashboard/mobile, M5-01c).
 * `formulaIds` é a ordem desejada completa das fórmulas fixadas naquela tela
 * — cada uma recebe sua posição (índice) como nova ordem.
 */
export async function reorderSavedFormulas(
  deps: UseCaseDeps,
  actor: Actor,
  field: ReorderField,
  formulaIds: string[]
): Promise<Either<SavedFormulaError, SavedFormula[]>> {
  const pinnedField = field === 'home' ? 'pinnedHome' : 'pinnedTransactions';
  const existing = await deps.repos.savedFormula.listByWorkspace(
    actor.workspaceId
  );
  const byId = new Map(existing.map((formula) => [formula.id, formula]));

  for (const id of formulaIds) {
    const formula = byId.get(id);
    if (!formula?.[pinnedField]) return left('formula_not_found');
  }

  const updated = await deps.uow.run(async (repos) => {
    const results: SavedFormula[] = [];
    for (const [index, id] of formulaIds.entries()) {
      const patch: SavedFormulaPatch =
        field === 'home' ? { homeOrder: index } : { transactionsOrder: index };
      results.push(await repos.savedFormula.update(id, patch));
    }
    return results;
  });
  return right(updated);
}
