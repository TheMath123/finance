import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { createTransactionRoute } from "./create-transaction";
import { listTransactionsRoute } from "./list-transactions";
import { updateTransactionRoute } from "./update-transaction";
import { deleteTransactionRoute } from "./delete-transaction";
import { restoreTransactionRoute } from "./restore-transaction";
import { exportTransactionsRoute } from "./export-transactions";
import { uploadAttachmentRoute } from "./upload-attachment";
import { deleteAttachmentRoute } from "./delete-attachment";
import { getAttachmentRoute } from "./get-attachment";

export function transactionRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listTransactionsRoute(deps))
    .use(createTransactionRoute(deps))
    .use(updateTransactionRoute(deps))
    .use(deleteTransactionRoute(deps))
    .use(restoreTransactionRoute(deps))
    .use(exportTransactionsRoute(deps))
    .use(uploadAttachmentRoute(deps))
    .use(deleteAttachmentRoute(deps))
    .use(getAttachmentRoute(deps));
}
