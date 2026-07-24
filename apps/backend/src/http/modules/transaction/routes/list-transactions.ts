import { Elysia } from 'elysia';
import { listTransactions } from '../../../../application/use-cases/transaction';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail } from '../../../http-error';
import { validateParams, validateQuery } from '../../../validate';
import { listTransactionsSchema, workspaceParamsSchema } from '../schemas';

export const listTransactionsRoute = (deps: AppDeps) =>
  new Elysia().get(
    '/workspaces/:workspaceId/transactions',
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
      const filters = validateQuery(listTransactionsSchema, query);
      if (!filters.ok) return fail(set, filters.error);
      return listTransactions(deps, auth.value, filters.value);
    }
  );
