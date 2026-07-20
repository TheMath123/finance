import { and, eq, inArray, isNull } from "drizzle-orm";
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
    async activeTransactionIds(transactionIds) {
      if (transactionIds.length === 0) return new Set();
      const rows = await db
        .select({ transactionId: expenseSplits.transactionId })
        .from(expenseSplits)
        .where(and(inArray(expenseSplits.transactionId, transactionIds), isNull(expenseSplits.cancelledAt)));
      return new Set(rows.map((r) => r.transactionId));
    },
    async cancel(id) {
      // Condicional (WHERE cancelled_at IS NULL) — idempotente contra dois cancels
      // paralelos (auditoria 2026-07-19). undefined = já estava cancelado.
      const [row] = await db
        .update(expenseSplits)
        .set({ cancelledAt: new Date() })
        .where(and(eq(expenseSplits.id, id), isNull(expenseSplits.cancelledAt)))
        .returning();
      return row;
    },
  };
}
