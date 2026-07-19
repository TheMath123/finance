import { and, eq, isNull } from "drizzle-orm";
import { expenseSplits } from "@finance/db";
import type { ExpenseSplitRepository } from "../../../application/ports/expense-split-repository";
import type { DbHandle } from "../handle";

export function createExpenseSplitRepository(db: DbHandle): ExpenseSplitRepository {
  return {
    async create(data) {
      const [row] = await db.insert(expenseSplits).values(data).returning();
      if (!row) throw new Error("falha ao criar split");
      return row;
    },
    findById: (id) => db.query.expenseSplits.findFirst({ where: eq(expenseSplits.id, id) }),
    findActiveByTransaction: (transactionId) =>
      db.query.expenseSplits.findFirst({
        where: and(eq(expenseSplits.transactionId, transactionId), isNull(expenseSplits.cancelledAt)),
      }),
    async cancel(id) {
      const [row] = await db
        .update(expenseSplits)
        .set({ cancelledAt: new Date() })
        .where(eq(expenseSplits.id, id))
        .returning();
      if (!row) throw new Error("falha ao cancelar split");
      return row;
    },
  };
}
