import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { recurringParamsSchema } from "../schemas";
import { RECURRING_ERRORS } from "../errors";
import { deleteRecurring } from "../services/delete-recurring";

export const deleteRecurringRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/recurring/:recurringId",
    async ({ request, params, set }) => {
      const p = parseParams(recurringParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteRecurring(deps, auth.value, p.value.recurringId);
      if (!result.ok) return fail(set, RECURRING_ERRORS[result.error]);
      set.status = 204;
    },
  );
