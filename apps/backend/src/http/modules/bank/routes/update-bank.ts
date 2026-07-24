import { Elysia } from 'elysia';
import { updateBank } from '../../../../application/use-cases/bank';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { BANK_ERRORS } from '../errors';
import { bankParamsSchema, updateBankSchema } from '../schemas';

export const updateBankRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/workspaces/:workspaceId/banks/:bankId',
    async ({ request, params, body, set }) => {
      const p = validateParams(bankParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateBankSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateBank(
        deps,
        auth.value,
        p.value.bankId,
        input.value
      );
      return respond(set, result, BANK_ERRORS);
    }
  );
