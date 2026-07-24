import { Elysia } from 'elysia';
import { rejectTransfer } from '../../../../application/use-cases/transfer';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { TRANSFER_ERRORS } from '../errors';
import { transferParamsSchema } from '../schemas';

export const rejectTransferRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/transfers/:id/reject',
    async ({ request, params, set }) => {
      const p = validateParams(transferParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireAuthenticated(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await rejectTransfer(deps, auth.value, p.value.id);
      return respond(set, result, TRANSFER_ERRORS);
    }
  );
