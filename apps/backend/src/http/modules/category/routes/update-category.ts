import { Elysia } from "elysia";
import { updateCategory } from "../../../../application/use-cases/category";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { categoryParamsSchema, updateCategorySchema } from "../schemas";
import { CATEGORY_ERRORS } from "../errors";

export const updateCategoryRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/categories/:categoryId",
    async ({ request, params, body, set }) => {
      const p = validateParams(categoryParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateCategorySchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateCategory(deps, auth.value, p.value.categoryId, input.value);
      return respond(set, result, CATEGORY_ERRORS);
    },
  );
