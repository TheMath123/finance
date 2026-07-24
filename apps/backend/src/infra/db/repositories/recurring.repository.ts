import { recurringTransactions } from '@finance/db';
import { and, eq } from 'drizzle-orm';
import type { RecurringRepository } from '../../../application/ports/recurring-repository';
import type { DbHandle } from '../handle';

export function createRecurringRepository(db: DbHandle): RecurringRepository {
  return {
    async create(workspaceId, data) {
      const [row] = await db
        .insert(recurringTransactions)
        .values({ ...data, workspaceId })
        .returning();
      if (!row) throw new Error('falha ao criar recorrência');
      return row;
    },
    findInWorkspace: (workspaceId, id) =>
      db.query.recurringTransactions.findFirst({
        where: and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.workspaceId, workspaceId)
        ),
      }),
    listByWorkspace: (workspaceId) =>
      db.query.recurringTransactions.findMany({
        where: eq(recurringTransactions.workspaceId, workspaceId),
      }),
    listActive: (workspaceId) =>
      db.query.recurringTransactions.findMany({
        where: and(
          eq(recurringTransactions.workspaceId, workspaceId),
          eq(recurringTransactions.active, true)
        ),
      }),
    listAllActive: () =>
      db.query.recurringTransactions.findMany({
        where: eq(recurringTransactions.active, true),
      }),
    async update(id, patch) {
      const [row] = await db
        .update(recurringTransactions)
        .set(patch)
        .where(eq(recurringTransactions.id, id))
        .returning();
      if (!row) throw new Error('falha ao atualizar recorrência');
      return row;
    },
    async delete(id) {
      await db
        .delete(recurringTransactions)
        .where(eq(recurringTransactions.id, id));
    },
  };
}
