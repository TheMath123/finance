import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { createCategoryRoute } from "./create-category";
import { listCategoriesRoute } from "./list-categories";
import { updateCategoryRoute } from "./update-category";
import { deleteCategoryRoute } from "./delete-category";

export function categoryRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listCategoriesRoute(deps))
    .use(createCategoryRoute(deps))
    .use(updateCategoryRoute(deps))
    .use(deleteCategoryRoute(deps));
}
