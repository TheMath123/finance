import { Elysia } from 'elysia';
import { linkGoogleAccount } from '../../../../application/use-cases/auth';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody } from '../../../validate';
import { AUTH_ERRORS } from '../errors';
import { linkGoogleSchema } from '../schemas';

export const linkGoogleRoute = (deps: AppDeps) =>
  new Elysia().post('/me/google/link', async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const input = validateBody(linkGoogleSchema, body);
    if (!input.ok) return fail(set, input.error);

    const result = await linkGoogleAccount(deps, {
      userId: auth.value.userId,
      idToken: input.value.idToken,
    });
    return respond(set, result, AUTH_ERRORS, 204);
  });
