import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { archiveCardRoute } from './archive-card';
import { confirmInvoiceCsvImportRoute } from './confirm-invoice-csv-import';
import { createCardRoute } from './create-card';
import { deleteCardRoute } from './delete-card';
import { listCardsRoute } from './list-cards';
import { listInvoicesRoute } from './list-invoices';
import { payInvoiceRoute } from './pay-invoice';
import { previewInvoiceCsvImportRoute } from './preview-invoice-csv-import';
import { undoInvoicePaymentRoute } from './undo-invoice-payment';
import { updateCardRoute } from './update-card';

export function cardRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listCardsRoute(deps))
    .use(createCardRoute(deps))
    .use(updateCardRoute(deps))
    .use(archiveCardRoute(deps))
    .use(deleteCardRoute(deps))
    .use(listInvoicesRoute(deps))
    .use(payInvoiceRoute(deps))
    .use(undoInvoicePaymentRoute(deps))
    .use(previewInvoiceCsvImportRoute(deps))
    .use(confirmInvoiceCsvImportRoute(deps));
}
