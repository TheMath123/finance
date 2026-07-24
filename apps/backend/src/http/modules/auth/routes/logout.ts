import { Elysia } from 'elysia';
import { logout } from '../../../../application/use-cases/auth';
import type { AppDeps } from '../../../deps';
import { fail } from '../../../http-error';
import { validateBody } from '../../../validate';
import { refreshSchema } from '../schemas';

export const logoutRoute = (deps: AppDeps) =>
  new Elysia().post('/logout', async ({ body, set }) => {
    const input = validateBody(refreshSchema, body);
    if (!input.ok) return fail(set, input.error);
    await logout(deps, input.value);
    set.status = 204;
  });
