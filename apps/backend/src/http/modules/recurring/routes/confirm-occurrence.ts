import { Elysia } from "elysia";
import { confirmOccurrence } from "../../../../application/use-cases/recurring";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { confirmOccurrenceSchema, recurringParamsSchema } from "../schemas";
import { RECURRING_ERRORS } from "../errors";

export const confirmOccurrenceRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/recurring/:recurringId/confirm",
    async ({ request, params, body, set }) => {
      const p = validateParams(recurringParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(confirmOccurrenceSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await confirmOccurrence(
        deps,
        auth.value,
        p.value.recurringId,
        input.value.date,
      );
      return respond(set, result, RECURRING_ERRORS, 201);
    },
  );
