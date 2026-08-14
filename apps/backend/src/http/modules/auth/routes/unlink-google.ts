import { Elysia } from 'elysia';
import { unlinkGoogleAccount } from '../../../../application/use-cases/auth';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { AUTH_ERRORS } from '../errors';

export const unlinkGoogleRoute = (deps: AppDeps) =>
  new Elysia().post('/me/google/unlink', async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const result = await unlinkGoogleAccount(deps, {
      userId: auth.value.userId,
    });
    return respond(set, result, AUTH_ERRORS, 204);
  });
