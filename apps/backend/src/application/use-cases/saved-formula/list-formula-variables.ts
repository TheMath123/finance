import type { Actor, UseCaseDeps } from '../../deps';
import {
  buildFormulaCatalog,
  currentYearMonth,
  type FormulaVariable,
} from './formula-variables';

export async function listFormulaVariables(
  deps: Pick<UseCaseDeps, 'repos' | 'cache'>,
  actor: Actor,
  year?: number,
  month?: number
): Promise<FormulaVariable[]> {
  const period = year && month ? { year, month } : currentYearMonth();
  const { variables } = await buildFormulaCatalog(
    deps,
    actor,
    period.year,
    period.month
  );
  return variables;
}
