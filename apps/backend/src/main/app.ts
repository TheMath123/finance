import { Elysia } from "elysia";
import { requestId } from "../http/request-id";
import { errorHandler } from "../http/error-handler";
import { authRoutes } from "../http/modules/auth/routes";
import { workspaceRoutes } from "../http/modules/workspace/routes";
import { bankRoutes } from "../http/modules/bank/routes";
import { accountRoutes } from "../http/modules/account/routes";
import { cardRoutes } from "../http/modules/card/routes";
import { categoryRoutes } from "../http/modules/category/routes";
import { transactionRoutes } from "../http/modules/transaction/routes";
import { recurringRoutes } from "../http/modules/recurring/routes";
import { summaryRoutes } from "../http/modules/summary/routes";
import { notificationRoutes } from "../http/modules/notification/routes";
import { whatsappRoutes } from "../http/modules/whatsapp/routes";
import { transferRoutes } from "../http/modules/transfer/routes";
import { splitRoutes } from "../http/modules/split/routes";
import type { AppDeps } from "../http/deps";

export function createApp(deps: AppDeps) {
  return new Elysia()
    .use(requestId)
    .use(errorHandler(deps.httpLogger))
    .get("/health", () => ({ status: "ok" }))
    .use(authRoutes(deps))
    .use(workspaceRoutes(deps))
    .use(bankRoutes(deps))
    .use(accountRoutes(deps))
    .use(cardRoutes(deps))
    .use(categoryRoutes(deps))
    .use(transactionRoutes(deps))
    .use(recurringRoutes(deps))
    .use(summaryRoutes(deps))
    .use(notificationRoutes(deps))
    .use(whatsappRoutes(deps))
    .use(transferRoutes(deps))
    .use(splitRoutes(deps));
}
