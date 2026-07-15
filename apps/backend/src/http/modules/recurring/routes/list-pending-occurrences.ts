import { Elysia } from "elysia";
import { listPendingOccurrences } from "../../../../application/use-cases/recurring";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams, validateQuery } from "../../../validate";
import { monthQuerySchema, workspaceParamsSchema } from "../schemas";

export const listPendingOccurrencesRoute = (deps: AppDeps) =>
  new Elysia().get(
    "/workspaces/:workspaceId/recurring/pending",
    async ({ request, params, query, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const q = validateQuery(monthQuerySchema, query);
      if (!q.ok) return fail(set, q.error);
      return listPendingOccurrences(deps, auth.value, q.value.year, q.value.month);
    },
  );
