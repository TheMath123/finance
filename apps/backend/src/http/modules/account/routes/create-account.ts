import { Elysia } from 'elysia';
import { createAccount } from '../../../../application/use-cases/account';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { ACCOUNT_ERRORS } from '../errors';
import { createAccountSchema, workspaceParamsSchema } from '../schemas';

export const createAccountRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/accounts',
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
      const input = validateBody(createAccountSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createAccount(deps, auth.value, input.value);
      return respond(set, result, ACCOUNT_ERRORS, 201);
    }
  );
