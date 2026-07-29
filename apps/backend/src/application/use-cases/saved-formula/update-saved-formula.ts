import { evaluateFormula } from '@finance/formula';
import { type Either, left, right } from '@finance/shared';
import type { SavedFormula } from '../../../domain/entities/saved-formula';
import type { Actor, UseCaseDeps } from '../../deps';
import type { SavedFormulaPatch } from '../../ports/saved-formula-repository';
import type { SavedFormulaError } from './errors';
import { buildFormulaCatalog, currentYearMonth } from './formula-variables';

export async function updateSavedFormula(
  deps: UseCaseDeps,
  actor: Actor,
  formulaId: string,
  patch: SavedFormulaPatch
): Promise<Either<SavedFormulaError, SavedFormula>> {
  const existing = await deps.repos.savedFormula.findInWorkspace(
    actor.workspaceId,
    formulaId
  );
  if (!existing) return left('formula_not_found');

  if (patch.expression !== undefined) {
    const { year, month } = currentYearMonth();
    const { values } = await buildFormulaCatalog(deps, actor, year, month);
    const evaluated = evaluateFormula(patch.expression, values);
    if (!evaluated.ok) return left(evaluated.error.type);
  }

  // Pin/despin muda a ordem: virar `true` manda pro fim da fila do widget
  // correspondente; virar `false` zera a posição (evita reaparecer numa
  // posição antiga obsoleta se for refixada depois). Ficar `true`→`true`
  // (ex.: PATCH só de nome) não mexe na ordem já existente.
  const orderPatch: SavedFormulaPatch = {};
  if (
    patch.pinnedHome !== undefined &&
    patch.pinnedHome !== existing.pinnedHome
  ) {
    orderPatch.homeOrder = patch.pinnedHome
      ? (await deps.repos.savedFormula.maxOrder(
          actor.workspaceId,
          'homeOrder'
        )) + 1
      : null;
  }
  if (
    patch.pinnedTransactions !== undefined &&
    patch.pinnedTransactions !== existing.pinnedTransactions
  ) {
    orderPatch.transactionsOrder = patch.pinnedTransactions
      ? (await deps.repos.savedFormula.maxOrder(
          actor.workspaceId,
          'transactionsOrder'
        )) + 1
      : null;
  }

  const updated = await deps.uow.run(async (repos) => {
    const formula = await repos.savedFormula.update(formulaId, {
      ...patch,
      ...orderPatch,
    });
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'update',
      entity: 'saved_formula',
      entityId: formula.id,
    });
    return formula;
  });
  return right(updated);
}
