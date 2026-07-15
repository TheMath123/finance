import { and, eq } from "drizzle-orm";
import { categories } from "@finance/db";
import type { CategoryRepository } from "../../../application/ports/category-repository";
import type { DbHandle } from "../handle";

export function createCategoryRepository(db: DbHandle): CategoryRepository {
  return {
    async create(workspaceId, data) {
      const [row] = await db
        .insert(categories)
        .values({ ...data, workspaceId })
        .returning();
      if (!row) throw new Error("falha ao criar categoria");
      return row;
    },
    async createMany(workspaceId, data) {
      return db
        .insert(categories)
        .values(data.map((c) => ({ ...c, workspaceId })))
        .returning();
    },
    findInWorkspace: (workspaceId, categoryId) =>
      db.query.categories.findFirst({
        where: and(eq(categories.id, categoryId), eq(categories.workspaceId, workspaceId)),
      }),
    listByWorkspace: (workspaceId) =>
      db.query.categories.findMany({ where: eq(categories.workspaceId, workspaceId) }),
    async update(categoryId, patch) {
      const [row] = await db
        .update(categories)
        .set(patch)
        .where(eq(categories.id, categoryId))
        .returning();
      if (!row) throw new Error("falha ao atualizar categoria");
      return row;
    },
    async delete(categoryId) {
      await db.delete(categories).where(eq(categories.id, categoryId));
    },
    findFallback: (workspaceId) =>
      db.query.categories.findFirst({
        where: and(eq(categories.workspaceId, workspaceId), eq(categories.isFallback, true)),
      }),
  };
}
