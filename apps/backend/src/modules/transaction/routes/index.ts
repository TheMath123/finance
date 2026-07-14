import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { createTransactionRoute } from "./create-transaction";
import { listTransactionsRoute } from "./list-transactions";
import { updateTransactionRoute } from "./update-transaction";
import { deleteTransactionRoute } from "./delete-transaction";
import { restoreTransactionRoute } from "./restore-transaction";

export function transactionRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listTransactionsRoute(deps))
    .use(createTransactionRoute(deps))
    .use(updateTransactionRoute(deps))
    .use(deleteTransactionRoute(deps))
    .use(restoreTransactionRoute(deps));
}
