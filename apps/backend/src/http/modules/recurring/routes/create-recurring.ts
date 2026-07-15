import { Elysia } from "elysia";
import { createRecurring } from "../../../../application/use-cases/recurring";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { createRecurringSchema, workspaceParamsSchema } from "../schemas";
import { RECURRING_ERRORS } from "../errors";

export const createRecurringRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/recurring",
    async ({ request, params, body, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(createRecurringSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createRecurring(deps, auth.value, input.value);
      return respond(set, result, RECURRING_ERRORS, 201);
    },
  );
