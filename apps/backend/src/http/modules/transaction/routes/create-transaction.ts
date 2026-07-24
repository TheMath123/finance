import { Elysia } from 'elysia';
import { createTransaction } from '../../../../application/use-cases/transaction';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { TRANSACTION_ERRORS } from '../errors';
import { createTransactionSchema, workspaceParamsSchema } from '../schemas';

export const createTransactionRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/transactions',
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
      const input = validateBody(createTransactionSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createTransaction(deps, auth.value, input.value);
      return respond(set, result, TRANSACTION_ERRORS, 201);
    }
  );
