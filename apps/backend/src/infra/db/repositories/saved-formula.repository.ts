import { savedFormulas } from '@finance/db';
import { and, eq, sql } from 'drizzle-orm';
import type { SavedFormulaRepository } from '../../../application/ports/saved-formula-repository';
import type { DbHandle } from '../handle';

export function createSavedFormulaRepository(
  db: DbHandle
): SavedFormulaRepository {
  return {
    async create(workspaceId, createdByUserId, draft) {
      const [row] = await db
        .insert(savedFormulas)
        .values({ ...draft, workspaceId, createdByUserId })
        .returning();
      if (!row) throw new Error('falha ao criar fórmula');
      return row;
    },
    findInWorkspace: (workspaceId, formulaId) =>
      db.query.savedFormulas.findFirst({
        where: and(
          eq(savedFormulas.id, formulaId),
          eq(savedFormulas.workspaceId, workspaceId)
        ),
      }),
    listByWorkspace: (workspaceId) =>
      db.query.savedFormulas.findMany({
        where: eq(savedFormulas.workspaceId, workspaceId),
      }),
    async update(formulaId, patch) {
      const [row] = await db
        .update(savedFormulas)
        .set(patch)
        .where(eq(savedFormulas.id, formulaId))
        .returning();
      if (!row) throw new Error('falha ao atualizar fórmula');
      return row;
    },
    async delete(formulaId) {
      await db.delete(savedFormulas).where(eq(savedFormulas.id, formulaId));
    },
    async countByWorkspace(workspaceId) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(savedFormulas)
        .where(eq(savedFormulas.workspaceId, workspaceId));
      return row?.count ?? 0;
    },
    async maxOrder(workspaceId, field) {
      const column =
        field === 'homeOrder'
          ? savedFormulas.homeOrder
          : savedFormulas.transactionsOrder;
      const [row] = await db
        .select({ max: sql<number | null>`MAX(${column})` })
        .from(savedFormulas)
        .where(eq(savedFormulas.workspaceId, workspaceId));
      return row?.max ?? -1;
    },
    async countPinned(workspaceId, field) {
      const column =
        field === 'homeOrder'
          ? savedFormulas.pinnedHome
          : savedFormulas.pinnedTransactions;
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(savedFormulas)
        .where(
          and(eq(savedFormulas.workspaceId, workspaceId), eq(column, true))
        );
      return row?.count ?? 0;
    },
  };
}
