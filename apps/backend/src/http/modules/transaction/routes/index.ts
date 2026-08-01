import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { createTransactionRoute } from './create-transaction';
import { deleteAttachmentRoute } from './delete-attachment';
import { deleteTransactionRoute } from './delete-transaction';
import { exportTransactionsRoute } from './export-transactions';
import { getAttachmentRoute } from './get-attachment';
import { listTransactionsRoute } from './list-transactions';
import { restoreTransactionRoute } from './restore-transaction';
import { updateInstallmentTotalRoute } from './update-installment-total';
import { updateTransactionRoute } from './update-transaction';
import { uploadAttachmentRoute } from './upload-attachment';

export function transactionRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listTransactionsRoute(deps))
    .use(createTransactionRoute(deps))
    .use(updateTransactionRoute(deps))
    .use(updateInstallmentTotalRoute(deps))
    .use(deleteTransactionRoute(deps))
    .use(restoreTransactionRoute(deps))
    .use(exportTransactionsRoute(deps))
    .use(uploadAttachmentRoute(deps))
    .use(deleteAttachmentRoute(deps))
    .use(getAttachmentRoute(deps));
}
