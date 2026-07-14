import { and, eq } from "drizzle-orm";
import { categories, type Category, type Db } from "@finance/db";

export async function findWorkspaceCategory(
  db: Db,
  workspaceId: string,
  categoryId: string,
): Promise<Category | undefined> {
  return db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.workspaceId, workspaceId)),
  });
}
