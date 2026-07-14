import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { categoryParamsSchema } from "../schemas";
import { CATEGORY_ERRORS } from "../errors";
import { deleteCategory } from "../services/delete-category";

export const deleteCategoryRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/categories/:categoryId",
    async ({ request, params, set }) => {
      const p = parseParams(categoryParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteCategory(deps, auth.value, p.value.categoryId);
      if (!result.ok) return fail(set, CATEGORY_ERRORS[result.error]);
      return result.value;
    },
  );
