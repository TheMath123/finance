import { evaluateFormula } from '@finance/formula';
import type { SavedFormulaDisplayFormat } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import type { SavedFormulaError } from './errors';
import { buildFormulaCatalog, currentYearMonth } from './formula-variables';

export interface EvaluatedFormula {
  value: number;
  displayFormat: SavedFormulaDisplayFormat;
}

export async function evaluateSavedFormula(
  deps: Pick<UseCaseDeps, 'repos' | 'cache'>,
  actor: Actor,
  formulaId: string,
  year?: number,
  month?: number
): Promise<Either<SavedFormulaError, EvaluatedFormula>> {
  const formula = await deps.repos.savedFormula.findInWorkspace(
    actor.workspaceId,
    formulaId
  );
  if (!formula) return left('formula_not_found');

  const period = year && month ? { year, month } : currentYearMonth();
  const { values } = await buildFormulaCatalog(
    deps,
    actor,
    period.year,
    period.month
  );
  const evaluated = evaluateFormula(formula.expression, values);
  if (!evaluated.ok) return left(evaluated.error.type);

  return right({
    value: evaluated.value,
    displayFormat: formula.displayFormat,
  });
}
