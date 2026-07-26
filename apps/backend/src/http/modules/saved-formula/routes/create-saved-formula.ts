import { Elysia } from 'elysia';
import { createSavedFormula } from '../../../../application/use-cases/saved-formula';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { SAVED_FORMULA_ERRORS } from '../errors';
import { createSavedFormulaSchema, workspaceParamsSchema } from '../schemas';

export const createSavedFormulaRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/saved-formulas',
    async ({ request, params, body, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(createSavedFormulaSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createSavedFormula(deps, auth.value, input.value);
      return respond(set, result, SAVED_FORMULA_ERRORS, 201);
    }
  );
