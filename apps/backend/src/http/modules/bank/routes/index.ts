import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { archiveBankRoute } from './archive-bank';
import { createBankRoute } from './create-bank';
import { deleteBankRoute } from './delete-bank';
import { listBanksRoute } from './list-banks';
import { updateBankRoute } from './update-bank';

export function bankRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listBanksRoute(deps))
    .use(createBankRoute(deps))
    .use(updateBankRoute(deps))
    .use(archiveBankRoute(deps))
    .use(deleteBankRoute(deps));
}
