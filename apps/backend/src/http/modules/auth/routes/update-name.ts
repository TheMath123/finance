import { Elysia } from 'elysia';
import { updateName } from '../../../../application/use-cases/auth';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody } from '../../../validate';
import { AUTH_ERRORS } from '../errors';
import { updateNameSchema } from '../schemas';

export const updateNameRoute = (deps: AppDeps) =>
  new Elysia().patch('/me', async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const input = validateBody(updateNameSchema, body);
    if (!input.ok) return fail(set, input.error);

    // userId sempre do JWT (auth.value.userId) — nunca de um campo do body.
    const result = await updateName(deps, {
      userId: auth.value.userId,
      name: input.value.name,
    });
    return respond(set, result, AUTH_ERRORS);
  });
