import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { createBankRoute } from "./create-bank";
import { listBanksRoute } from "./list-banks";
import { updateBankRoute } from "./update-bank";
import { archiveBankRoute } from "./archive-bank";
import { deleteBankRoute } from "./delete-bank";

export function bankRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listBanksRoute(deps))
    .use(createBankRoute(deps))
    .use(updateBankRoute(deps))
    .use(archiveBankRoute(deps))
    .use(deleteBankRoute(deps));
}
