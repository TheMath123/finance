import { Elysia } from 'elysia';
import { evaluateSavedFormula } from '../../../../application/use-cases/saved-formula';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams, validateQuery } from '../../../validate';
import { SAVED_FORMULA_ERRORS } from '../errors';
import { formulaParamsSchema, periodQuerySchema } from '../schemas';

export const evaluateSavedFormulaRoute = (deps: AppDeps) =>
  new Elysia().get(
    '/workspaces/:workspaceId/saved-formulas/:formulaId/evaluate',
    async ({ request, params, query, set }) => {
      const p = validateParams(formulaParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'viewer'
      );
      if (!auth.ok) return fail(set, auth.error);
      const q = validateQuery(periodQuerySchema, query);
      if (!q.ok) return fail(set, q.error);
      const result = await evaluateSavedFormula(
        deps,
        auth.value,
        p.value.formulaId,
        q.value.year,
        q.value.month
      );
      return respond(set, result, SAVED_FORMULA_ERRORS);
    }
  );
