import { Elysia } from 'elysia';
import { googleSignIn } from '../../../../application/use-cases/auth';
import type { AppDeps } from '../../../deps';
import { fail, respond } from '../../../http-error';
import { validateBody } from '../../../validate';
import { AUTH_ERRORS } from '../errors';
import { googleSignInSchema } from '../schemas';

export const googleSignInRoute = (deps: AppDeps) =>
  new Elysia().post('/google', async ({ body, set }) => {
    const input = validateBody(googleSignInSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await googleSignIn(deps, input.value);
    return respond(set, result, AUTH_ERRORS, 201);
  });
