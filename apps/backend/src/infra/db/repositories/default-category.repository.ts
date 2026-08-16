import { defaultCategories } from '@finance/db';
import { asc, eq, sql } from 'drizzle-orm';
import type { DefaultCategoryRepository } from '../../../application/ports/default-category-repository';
import { toPrefixTsQuery } from '../full-text-search';
import type { DbHandle } from '../handle';

export function createDefaultCategoryRepository(
  db: DbHandle
): DefaultCategoryRepository {
  return {
    list: (search) => {
      const tsQuery = search ? toPrefixTsQuery(search) : null;
      return db.query.defaultCategories.findMany({
        where: tsQuery
          ? sql`${defaultCategories.searchVector} @@ to_tsquery('portuguese', ${tsQuery})`
          : undefined,
        orderBy: asc(defaultCategories.name),
      });
    },
    async create(data) {
      const [row] = await db.insert(defaultCategories).values(data).returning();
      if (!row) throw new Error('falha ao criar categoria padrão');
      return row;
    },
    async update(id, patch) {
      const [row] = await db
        .update(defaultCategories)
        .set(patch)
        .where(eq(defaultCategories.id, id))
        .returning();
      if (!row) throw new Error('falha ao atualizar categoria padrão');
      return row;
    },
    async delete(id) {
      await db.delete(defaultCategories).where(eq(defaultCategories.id, id));
    },
    findById: (id) =>
      db.query.defaultCategories.findFirst({
        where: eq(defaultCategories.id, id),
      }),
  };
}
