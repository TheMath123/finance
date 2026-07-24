import { Elysia } from 'elysia';
import { listTransferAccounts } from '../../../../application/use-cases/transfer';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail } from '../../../http-error';

export const listTransferAccountsRoute = (deps: AppDeps) =>
  new Elysia().get('/transfers/accounts', async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listTransferAccounts(deps, auth.value);
  });
