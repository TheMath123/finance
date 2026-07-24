import { Elysia } from 'elysia';
import { removeTrustedContact } from '../../../../application/use-cases/transfer';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail } from '../../../http-error';
import { validateParams } from '../../../validate';
import { trustedContactParamsSchema } from '../schemas';

export const removeTrustedContactRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/trusted-contacts/:id',
    async ({ request, params, set }) => {
      const p = validateParams(trustedContactParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireAuthenticated(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      await removeTrustedContact(deps, auth.value, p.value.id);
      set.status = 204;
    }
  );
