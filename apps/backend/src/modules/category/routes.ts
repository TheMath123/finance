import { Elysia } from "elysia";
import { z } from "zod";
import type { Db } from "@finance/db";
import { fail, parse, requireRole, type HttpError } from "../../lib/http";
import * as categoryService from "./service";
import type { CategoryError } from "./service";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
const updateSchema = createSchema.partial();

const ERRORS: Record<CategoryError, HttpError> = {
  category_not_found: {
    status: 404,
    code: "category_not_found",
    message: "Categoria não encontrada.",
  },
  fallback_not_deletable: {
    status: 409,
    code: "fallback_not_deletable",
    message: 'A categoria "Outros" não pode ser excluída.',
  },
};

export function categoryRoutes(deps: { db: Db; jwtSecret: string }) {
  return new Elysia({ prefix: "/workspaces/:workspaceId/categories" })
    .get("/", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      return categoryService.listCategories(deps, auth.value);
    })
    .post("/", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await categoryService.createCategory(deps, auth.value, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 201;
      return result.value;
    })
    .patch("/:categoryId", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await categoryService.updateCategory(
        deps,
        auth.value,
        params.categoryId,
        input.value,
      );
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .delete("/:categoryId", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await categoryService.deleteCategory(deps, auth.value, params.categoryId);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    });
}
