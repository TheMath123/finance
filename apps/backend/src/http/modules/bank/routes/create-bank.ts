import { Elysia } from 'elysia';
import { createBank } from '../../../../application/use-cases/bank';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { BANK_ERRORS } from '../errors';
import { createBankSchema, workspaceParamsSchema } from '../schemas';

export const createBankRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/banks',
    async ({ request, params, body, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(createBankSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createBank(deps, auth.value, input.value);
      return respond(set, result, BANK_ERRORS, 201);
    }
  );
