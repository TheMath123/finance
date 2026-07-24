import { Elysia } from 'elysia';
import { listTrustedContacts } from '../../../../application/use-cases/transfer';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail } from '../../../http-error';

export const listTrustedContactsRoute = (deps: AppDeps) =>
  new Elysia().get('/trusted-contacts', async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listTrustedContacts(deps, auth.value);
  });
