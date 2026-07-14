import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { listTransactionsSchema, workspaceParamsSchema } from "../schemas";
import { listTransactions } from "../services/list-transactions";

export const listTransactionsRoute = (deps: AppDeps) =>
  new Elysia().get(
    "/workspaces/:workspaceId/transactions",
    async ({ request, params, query, set }) => {
      const p = parseParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const filters = parse(listTransactionsSchema, query);
      if (!filters.ok) return fail(set, filters.error);
      return listTransactions(deps, auth.value, filters.value);
    },
  );
