import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { archiveAccountRoute } from './archive-account';
import { confirmAccountCsvImportRoute } from './confirm-account-csv-import';
import { createAccountRoute } from './create-account';
import { deleteAccountRoute } from './delete-account';
import { listAccountsRoute } from './list-accounts';
import { previewAccountCsvImportRoute } from './preview-account-csv-import';
import { updateAccountRoute } from './update-account';

export function accountRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listAccountsRoute(deps))
    .use(createAccountRoute(deps))
    .use(updateAccountRoute(deps))
    .use(archiveAccountRoute(deps))
    .use(deleteAccountRoute(deps))
    .use(previewAccountCsvImportRoute(deps))
    .use(confirmAccountCsvImportRoute(deps));
}
