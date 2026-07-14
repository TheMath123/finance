import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { createRecurringSchema, workspaceParamsSchema } from "../schemas";
import { RECURRING_ERRORS } from "../errors";
import { createRecurring } from "../services/create-recurring";

export const createRecurringRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/recurring",
    async ({ request, params, body, set }) => {
      const p = parseParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createRecurringSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createRecurring(deps, auth.value, input.value);
      if (!result.ok) return fail(set, RECURRING_ERRORS[result.error]);
      set.status = 201;
      return result.value;
    },
  );
