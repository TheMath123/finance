import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { transactionParamsSchema, updateTransactionSchema } from "../schemas";
import { TRANSACTION_ERRORS } from "../errors";
import { updateTransaction } from "../services/update-transaction";

export const updateTransactionRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/transactions/:transactionId",
    async ({ request, params, body, set }) => {
      const p = parseParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateTransactionSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateTransaction(deps, auth.value, p.value.transactionId, input.value);
      if (!result.ok) return fail(set, TRANSACTION_ERRORS[result.error]);
      return result.value;
    },
  );
