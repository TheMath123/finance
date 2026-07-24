import { Elysia } from 'elysia';
import { createInvite } from '../../../../application/use-cases/workspace';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { WORKSPACE_ERRORS } from '../errors';
import { createInviteSchema, workspaceParamsSchema } from '../schemas';

export const createInviteRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/invites',
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
      const input = validateBody(createInviteSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createInvite(deps, auth.value, input.value);
      return respond(set, result, WORKSPACE_ERRORS, 201);
    }
  );
