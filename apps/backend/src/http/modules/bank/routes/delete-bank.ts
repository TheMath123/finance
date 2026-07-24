import { Elysia } from 'elysia';
import { deleteBank } from '../../../../application/use-cases/bank';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { BANK_ERRORS } from '../errors';
import { bankParamsSchema } from '../schemas';

export const deleteBankRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/workspaces/:workspaceId/banks/:bankId',
    async ({ request, params, set }) => {
      const p = validateParams(bankParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteBank(deps, auth.value, p.value.bankId);
      return respond(set, result, BANK_ERRORS, 204);
    }
  );
