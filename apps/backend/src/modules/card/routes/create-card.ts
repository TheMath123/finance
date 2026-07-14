import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { createCardSchema, workspaceParamsSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";
import { createCard } from "../services/create-card";

export const createCardRoute = (deps: AppDeps) =>
  new Elysia().post("/workspaces/:workspaceId/cards", async ({ request, params, body, set }) => {
    const p = parseParams(workspaceParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
    if (!auth.ok) return fail(set, auth.error);
    const input = parse(createCardSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await createCard(deps, auth.value, input.value);
    if (!result.ok) return fail(set, CARD_ERRORS[result.error]);
    set.status = 201;
    return result.value;
  });
