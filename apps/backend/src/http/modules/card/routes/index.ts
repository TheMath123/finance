import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { archiveCardRoute } from './archive-card';
import { createCardRoute } from './create-card';
import { deleteCardRoute } from './delete-card';
import { listCardsRoute } from './list-cards';
import { listInvoicesRoute } from './list-invoices';
import { payInvoiceRoute } from './pay-invoice';
import { updateCardRoute } from './update-card';

export function cardRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listCardsRoute(deps))
    .use(createCardRoute(deps))
    .use(updateCardRoute(deps))
    .use(archiveCardRoute(deps))
    .use(deleteCardRoute(deps))
    .use(listInvoicesRoute(deps))
    .use(payInvoiceRoute(deps));
}
