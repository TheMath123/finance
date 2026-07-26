import { Elysia } from 'elysia';
import { deleteSavedFormula } from '../../../../application/use-cases/saved-formula';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { SAVED_FORMULA_ERRORS } from '../errors';
import { formulaParamsSchema } from '../schemas';

export const deleteSavedFormulaRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/workspaces/:workspaceId/saved-formulas/:formulaId',
    async ({ request, params, set }) => {
      const p = validateParams(formulaParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteSavedFormula(
        deps,
        auth.value,
        p.value.formulaId
      );
      return respond(set, result, SAVED_FORMULA_ERRORS, 204);
    }
  );
