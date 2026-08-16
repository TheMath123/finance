import { Elysia } from 'elysia';
import { changePassword } from '../../../../application/use-cases/auth';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody } from '../../../validate';
import { AUTH_ERRORS } from '../errors';
import { changePasswordSchema } from '../schemas';

export const changePasswordRoute = (deps: AppDeps) =>
  new Elysia().post('/me/password', async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const input = validateBody(changePasswordSchema, body);
    if (!input.ok) return fail(set, input.error);

    // userId sempre do JWT — nunca de um campo do body.
    const result = await changePassword(deps, {
      userId: auth.value.userId,
      currentPassword: input.value.currentPassword,
      newPassword: input.value.newPassword,
      currentRefreshToken: input.value.currentRefreshToken,
    });
    return respond(set, result, AUTH_ERRORS, 204);
  });
