import { eq } from "drizzle-orm";
import { categories, type Category } from "@finance/db";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";

export async function listCategories(deps: DbDeps, actor: Actor): Promise<Category[]> {
  return deps.db.query.categories.findMany({
    where: eq(categories.workspaceId, actor.workspaceId),
  });
}
