import { categories } from '@finance/db';
import { and, asc, eq } from 'drizzle-orm';
import type { CategoryRepository } from '../../../application/ports/category-repository';
import type { DbHandle } from '../handle';

export function createCategoryRepository(db: DbHandle): CategoryRepository {
  return {
    async create(workspaceId, data) {
      const [row] = await db
        .insert(categories)
        .values({ ...data, workspaceId })
        .returning();
      if (!row) throw new Error('falha ao criar categoria');
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
        where: and(
          eq(categories.id, categoryId),
          eq(categories.workspaceId, workspaceId)
        ),
      }),
    // Ordem alfabética sempre — é a lista que alimenta todo select/picker de
    // categoria do app (transações, recorrências, "Mais > Categorias"), sem
    // isso a ordem ficava a critério de como o Postgres decidisse devolver
    // (essencialmente ordem de inserção, nada previsível pro usuário).
    listByWorkspace: (workspaceId) =>
      db.query.categories.findMany({
        where: eq(categories.workspaceId, workspaceId),
        orderBy: asc(categories.name),
      }),
    async update(categoryId, patch) {
      const [row] = await db
        .update(categories)
        .set(patch)
        .where(eq(categories.id, categoryId))
        .returning();
      if (!row) throw new Error('falha ao atualizar categoria');
      return row;
    },
    async delete(categoryId) {
      await db.delete(categories).where(eq(categories.id, categoryId));
    },
    findFallback: (workspaceId) =>
      db.query.categories.findFirst({
        where: and(
          eq(categories.workspaceId, workspaceId),
          eq(categories.isFallback, true)
        ),
      }),
  };
}
