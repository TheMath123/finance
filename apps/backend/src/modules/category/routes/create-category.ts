import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { createCategorySchema, workspaceParamsSchema } from "../schemas";
import { CATEGORY_ERRORS } from "../errors";
import { createCategory } from "../services/create-category";

export const createCategoryRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/categories",
    async ({ request, params, body, set }) => {
      const p = parseParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createCategorySchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createCategory(deps, auth.value, input.value);
      if (!result.ok) return fail(set, CATEGORY_ERRORS[result.error]);
      set.status = 201;
      return result.value;
    },
  );
