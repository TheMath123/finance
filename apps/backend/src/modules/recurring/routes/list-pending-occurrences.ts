import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { monthQuerySchema, workspaceParamsSchema } from "../schemas";
import { listPendingOccurrences } from "../services/list-pending-occurrences";

export const listPendingOccurrencesRoute = (deps: AppDeps) =>
  new Elysia().get(
    "/workspaces/:workspaceId/recurring/pending",
    async ({ request, params, query, set }) => {
      const p = parseParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const q = parse(monthQuerySchema, query);
      if (!q.ok) return fail(set, q.error);
      return listPendingOccurrences(deps, auth.value, q.value.year, q.value.month);
    },
  );
