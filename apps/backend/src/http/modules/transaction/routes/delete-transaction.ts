import { Elysia } from "elysia";
import { deleteTransaction } from "../../../../application/use-cases/transaction";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { transactionParamsSchema } from "../schemas";
import { TRANSACTION_ERRORS } from "../errors";

export const deleteTransactionRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/transactions/:transactionId",
    async ({ request, params, set }) => {
      const p = validateParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteTransaction(deps, auth.value, p.value.transactionId);
      return respond(set, result, TRANSACTION_ERRORS);
    },
  );
