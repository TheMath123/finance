import { Elysia } from 'elysia';
import { listFormulaVariables } from '../../../../application/use-cases/saved-formula';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail } from '../../../http-error';
import { validateParams, validateQuery } from '../../../validate';
import { periodQuerySchema, workspaceParamsSchema } from '../schemas';

export const listFormulaVariablesRoute = (deps: AppDeps) =>
  new Elysia().get(
    '/workspaces/:workspaceId/saved-formulas/variables',
    async ({ request, params, query, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
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
      return listFormulaVariables(
        deps,
        auth.value,
        q.value.year,
        q.value.month
      );
    }
  );
