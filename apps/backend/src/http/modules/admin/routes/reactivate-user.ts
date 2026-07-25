import { Elysia } from 'elysia';
import { reactivateUser } from '../../../../application/use-cases/admin';
import type { AppDeps } from '../../../deps';
import { requireSuperadmin } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { ADMIN_ERRORS } from '../errors';
import { userParamsSchema } from '../schemas';

export const reactivateUserRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/admin/users/:userId/reactivate',
    async ({ request, params, set }) => {
      const p = validateParams(userParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await reactivateUser(
        deps,
        auth.value.userId,
        p.value.userId
      );
      return respond(set, result, ADMIN_ERRORS, 204);
    }
  );
