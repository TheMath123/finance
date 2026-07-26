import { evaluateFormula } from '@finance/formula';
import { type Either, left, right } from '@finance/shared';
import type { SavedFormula } from '../../../domain/entities/saved-formula';
import { FREE_PLAN_LIMITS } from '../../../domain/services/plan-limits';
import type { Actor, UseCaseDeps } from '../../deps';
import type { SavedFormulaDraft } from '../../ports/saved-formula-repository';
import type { SavedFormulaError } from './errors';
import { buildFormulaCatalog, currentYearMonth } from './formula-variables';

export async function createSavedFormula(
  deps: UseCaseDeps,
  actor: Actor,
  input: SavedFormulaDraft
): Promise<Either<SavedFormulaError, SavedFormula>> {
  const workspace = await deps.repos.workspace.findById(actor.workspaceId);
  if (workspace?.plan === 'free') {
    const count = await deps.repos.savedFormula.countByWorkspace(
      actor.workspaceId
    );
    if (count >= FREE_PLAN_LIMITS.maxSavedFormulasPerWorkspace) {
      return left('plan_limit_reached');
    }
  }

  const { year, month } = currentYearMonth();
  const { values } = await buildFormulaCatalog(deps, actor, year, month);
  const evaluated = evaluateFormula(input.expression, values);
  if (!evaluated.ok) return left(evaluated.error.type);

  const created = await deps.uow.run(async (repos) => {
    const formula = await repos.savedFormula.create(
      actor.workspaceId,
      actor.userId,
      input
    );
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'create',
      entity: 'saved_formula',
      entityId: formula.id,
    });
    return formula;
  });
  return right(created);
}
