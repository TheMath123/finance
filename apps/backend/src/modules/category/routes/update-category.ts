import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { categoryParamsSchema, updateCategorySchema } from "../schemas";
import { CATEGORY_ERRORS } from "../errors";
import { updateCategory } from "../services/update-category";

export const updateCategoryRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/categories/:categoryId",
    async ({ request, params, body, set }) => {
      const p = parseParams(categoryParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateCategorySchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateCategory(deps, auth.value, p.value.categoryId, input.value);
      if (!result.ok) return fail(set, CATEGORY_ERRORS[result.error]);
      return result.value;
    },
  );
