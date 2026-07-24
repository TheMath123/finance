import { Elysia } from 'elysia';
import { restoreTransaction } from '../../../../application/use-cases/transaction';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { TRANSACTION_ERRORS } from '../errors';
import { transactionParamsSchema } from '../schemas';

export const restoreTransactionRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/transactions/:transactionId/restore',
    async ({ request, params, set }) => {
      const p = validateParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const result = await restoreTransaction(
        deps,
        auth.value,
        p.value.transactionId
      );
      return respond(set, result, TRANSACTION_ERRORS);
    }
  );
