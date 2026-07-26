import { Elysia } from 'elysia';
import { updateSavedFormula } from '../../../../application/use-cases/saved-formula';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { SAVED_FORMULA_ERRORS } from '../errors';
import { formulaParamsSchema, updateSavedFormulaSchema } from '../schemas';

export const updateSavedFormulaRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/workspaces/:workspaceId/saved-formulas/:formulaId',
    async ({ request, params, body, set }) => {
      const p = validateParams(formulaParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateSavedFormulaSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateSavedFormula(
        deps,
        auth.value,
        p.value.formulaId,
        input.value
      );
      return respond(set, result, SAVED_FORMULA_ERRORS);
    }
  );
