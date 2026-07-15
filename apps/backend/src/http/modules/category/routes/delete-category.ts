import { Elysia } from "elysia";
import { deleteCategory } from "../../../../application/use-cases/category";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { categoryParamsSchema } from "../schemas";
import { CATEGORY_ERRORS } from "../errors";

export const deleteCategoryRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/categories/:categoryId",
    async ({ request, params, set }) => {
      const p = validateParams(categoryParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteCategory(deps, auth.value, p.value.categoryId);
      return respond(set, result, CATEGORY_ERRORS);
    },
  );
