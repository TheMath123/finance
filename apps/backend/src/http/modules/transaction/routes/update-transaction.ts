import { Elysia } from 'elysia';
import { updateTransaction } from '../../../../application/use-cases/transaction';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { TRANSACTION_ERRORS } from '../errors';
import { transactionParamsSchema, updateTransactionSchema } from '../schemas';

export const updateTransactionRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/workspaces/:workspaceId/transactions/:transactionId',
    async ({ request, params, body, set }) => {
      const p = validateParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateTransactionSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateTransaction(
        deps,
        auth.value,
        p.value.transactionId,
        input.value
      );
      return respond(set, result, TRANSACTION_ERRORS);
    }
  );
