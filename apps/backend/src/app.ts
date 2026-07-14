import { Elysia } from "elysia";
import { authRoutes } from "./modules/auth/routes";
import { workspaceRoutes } from "./modules/workspace/routes";
import { bankRoutes } from "./modules/bank/routes";
import { accountRoutes } from "./modules/account/routes";
import { cardRoutes } from "./modules/card/routes";
import { categoryRoutes } from "./modules/category/routes";
import { transactionRoutes } from "./modules/transaction/routes";
import { recurringRoutes } from "./modules/recurring/routes";
import { summaryRoutes } from "./modules/summary/routes";
import type { AppDeps } from "./lib/deps";

export type { AppDeps };

export function createApp(deps: AppDeps) {
  return new Elysia()
    .get("/health", () => ({ status: "ok" }))
    .use(authRoutes(deps))
    .use(workspaceRoutes(deps))
    .use(bankRoutes(deps))
    .use(accountRoutes(deps))
    .use(cardRoutes(deps))
    .use(categoryRoutes(deps))
    .use(transactionRoutes(deps))
    .use(recurringRoutes(deps))
    .use(summaryRoutes(deps));
}
