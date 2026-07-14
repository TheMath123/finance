import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { recurringParamsSchema, updateRecurringSchema } from "../schemas";
import { RECURRING_ERRORS } from "../errors";
import { updateRecurring } from "../services/update-recurring";

export const updateRecurringRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/recurring/:recurringId",
    async ({ request, params, body, set }) => {
      const p = parseParams(recurringParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateRecurringSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateRecurring(deps, auth.value, p.value.recurringId, input.value);
      if (!result.ok) return fail(set, RECURRING_ERRORS[result.error]);
      return result.value;
    },
  );
