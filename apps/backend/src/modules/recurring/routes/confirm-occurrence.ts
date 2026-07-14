import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { confirmOccurrenceSchema, recurringParamsSchema } from "../schemas";
import { RECURRING_ERRORS } from "../errors";
import { confirmOccurrence } from "../services/confirm-occurrence";

export const confirmOccurrenceRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/recurring/:recurringId/confirm",
    async ({ request, params, body, set }) => {
      const p = parseParams(recurringParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(confirmOccurrenceSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await confirmOccurrence(
        deps,
        auth.value,
        p.value.recurringId,
        input.value.date,
      );
      if (!result.ok) return fail(set, RECURRING_ERRORS[result.error]);
      set.status = 201;
      return result.value;
    },
  );
