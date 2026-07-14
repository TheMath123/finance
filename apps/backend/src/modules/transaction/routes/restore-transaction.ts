import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { transactionParamsSchema } from "../schemas";
import { TRANSACTION_ERRORS } from "../errors";
import { restoreTransaction } from "../services/restore-transaction";

export const restoreTransactionRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/transactions/:transactionId/restore",
    async ({ request, params, set }) => {
      const p = parseParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const result = await restoreTransaction(deps, auth.value, p.value.transactionId);
      if (!result.ok) return fail(set, TRANSACTION_ERRORS[result.error]);
      return result.value;
    },
  );
