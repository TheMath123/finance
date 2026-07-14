import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { workspaceParamsSchema } from "../schemas";
import { listCategories } from "../services/list-categories";

export const listCategoriesRoute = (deps: AppDeps) =>
  new Elysia().get("/workspaces/:workspaceId/categories", async ({ request, params, set }) => {
    const p = parseParams(workspaceParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireRole(deps, request, p.value.workspaceId, "viewer");
    if (!auth.ok) return fail(set, auth.error);
    return listCategories(deps, auth.value);
  });
