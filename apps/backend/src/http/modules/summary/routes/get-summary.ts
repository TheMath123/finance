import { Elysia } from 'elysia';
import { monthlySummary } from '../../../../application/use-cases/summary';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail } from '../../../http-error';
import { validateParams, validateQuery } from '../../../validate';
import { monthQuerySchema, workspaceParamsSchema } from '../schemas';

/** Visão mensal: receitas, despesas, por categoria, saldo total e disponível projetado. */
export const getSummaryRoute = (deps: AppDeps) =>
  new Elysia().get(
    '/workspaces/:workspaceId/summary',
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
      const q = validateQuery(monthQuerySchema, query);
      if (!q.ok) return fail(set, q.error);
      return monthlySummary(deps, auth.value, q.value.year, q.value.month);
    }
  );
