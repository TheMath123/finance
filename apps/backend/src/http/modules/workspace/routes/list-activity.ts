import { Elysia } from "elysia";
import { listActivity } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams, validateQuery } from "../../../validate";
import { listActivitySchema, workspaceParamsSchema } from "../schemas";

export const listActivityRoute = (deps: AppDeps) =>
  new Elysia().get("/workspaces/:workspaceId/activity", async ({ request, params, query, set }) => {
    const p = validateParams(workspaceParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "viewer");
    if (!auth.ok) return fail(set, auth.error);
    const filters = validateQuery(listActivitySchema, query);
    if (!filters.ok) return fail(set, filters.error);
    return listActivity(deps, auth.value, filters.value);
  });
