import { Elysia } from "elysia";
import { listPendingTransfers } from "../../../../application/use-cases/transfer";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";

export const listPendingTransfersRoute = (deps: AppDeps) =>
  new Elysia().get("/transfers/pending", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listPendingTransfers(deps, auth.value);
  });
