import { Elysia } from 'elysia';
import { createWorkspace } from '../../../../application/use-cases/workspace';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody } from '../../../validate';
import { WORKSPACE_ERRORS } from '../errors';
import { createWorkspaceSchema } from '../schemas';

export const createWorkspaceRoute = (deps: AppDeps) =>
  new Elysia().post('/workspaces', async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const input = validateBody(createWorkspaceSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await createWorkspace(deps, auth.value.userId, input.value);
    return respond(set, result, WORKSPACE_ERRORS, 201);
  });
