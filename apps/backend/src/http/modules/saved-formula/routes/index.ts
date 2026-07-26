import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { createSavedFormulaRoute } from './create-saved-formula';
import { deleteSavedFormulaRoute } from './delete-saved-formula';
import { evaluateSavedFormulaRoute } from './evaluate-saved-formula';
import { listFormulaVariablesRoute } from './list-formula-variables';
import { listSavedFormulasRoute } from './list-saved-formulas';
import { updateSavedFormulaRoute } from './update-saved-formula';

export function savedFormulaRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listFormulaVariablesRoute(deps))
    .use(listSavedFormulasRoute(deps))
    .use(createSavedFormulaRoute(deps))
    .use(updateSavedFormulaRoute(deps))
    .use(deleteSavedFormulaRoute(deps))
    .use(evaluateSavedFormulaRoute(deps));
}
