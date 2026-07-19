import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { createTransferRoute } from "./create-transfer";
import { acceptTransferRoute } from "./accept-transfer";
import { rejectTransferRoute } from "./reject-transfer";
import { listPendingTransfersRoute } from "./list-pending-transfers";
import { listTransferAccountsRoute } from "./list-transfer-accounts";
import { listTrustedContactsRoute } from "./list-trusted-contacts";
import { removeTrustedContactRoute } from "./remove-trusted-contact";

export function transferRoutes(deps: AppDeps) {
  return new Elysia()
    .use(createTransferRoute(deps))
    .use(acceptTransferRoute(deps))
    .use(rejectTransferRoute(deps))
    .use(listPendingTransfersRoute(deps))
    .use(listTransferAccountsRoute(deps))
    .use(listTrustedContactsRoute(deps))
    .use(removeTrustedContactRoute(deps));
}
