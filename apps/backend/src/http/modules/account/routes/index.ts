import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { archiveAccountRoute } from './archive-account';
import { createAccountRoute } from './create-account';
import { deleteAccountRoute } from './delete-account';
import { listAccountsRoute } from './list-accounts';
import { updateAccountRoute } from './update-account';

export function accountRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listAccountsRoute(deps))
    .use(createAccountRoute(deps))
    .use(updateAccountRoute(deps))
    .use(archiveAccountRoute(deps))
    .use(deleteAccountRoute(deps));
}
