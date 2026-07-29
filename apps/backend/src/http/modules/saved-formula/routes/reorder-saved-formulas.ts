import { Elysia } from 'elysia';
import { reorderSavedFormulas } from '../../../../application/use-cases/saved-formula';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { SAVED_FORMULA_ERRORS } from '../errors';
import { reorderSavedFormulasSchema, workspaceParamsSchema } from '../schemas';

export const reorderSavedFormulasRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/workspaces/:workspaceId/saved-formulas/reorder',
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
      const input = validateBody(reorderSavedFormulasSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await reorderSavedFormulas(
        deps,
        auth.value,
        input.value.field,
        input.value.formulaIds
      );
      return respond(set, result, SAVED_FORMULA_ERRORS);
    }
  );
