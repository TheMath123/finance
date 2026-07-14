import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { createTransactionSchema, workspaceParamsSchema } from "../schemas";
import { TRANSACTION_ERRORS } from "../errors";
import { createTransaction } from "../services/create-transaction";

export const createTransactionRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/transactions",
    async ({ request, params, body, set }) => {
      const p = parseParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createTransactionSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createTransaction(deps, auth.value, input.value);
      if (!result.ok) return fail(set, TRANSACTION_ERRORS[result.error]);
      set.status = 201;
      return result.value;
    },
  );
