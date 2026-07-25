import { Elysia } from 'elysia';
import { listUsers } from '../../../../application/use-cases/admin';
import type { AppDeps } from '../../../deps';
import { requireSuperadmin } from '../../../guards';
import { fail } from '../../../http-error';
import { validateQuery } from '../../../validate';
import { listUsersQuerySchema } from '../schemas';

export const listUsersRoute = (deps: AppDeps) =>
  new Elysia().get('/admin/users', async ({ request, query, set }) => {
    const auth = await requireSuperadmin(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const filters = validateQuery(listUsersQuerySchema, query);
    if (!filters.ok) return fail(set, filters.error);
    return listUsers(deps, filters.value);
  });
