import { and, eq, ne } from "drizzle-orm";
import { expenseSplits, splitShares, transactions, users } from "@finance/db";
import type { SplitShareRepository } from "../../../application/ports/split-share-repository";
import type { DbHandle } from "../handle";

export function createSplitShareRepository(db: DbHandle): SplitShareRepository {
  return {
    async createMany(shares) {
      if (shares.length === 0) return [];
      return db.insert(splitShares).values(shares).returning();
    },
    findById: (id) => db.query.splitShares.findFirst({ where: eq(splitShares.id, id) }),
    listBySplit: (splitId) => db.query.splitShares.findMany({ where: eq(splitShares.splitId, splitId) }),
    async updateStatus(id, status, reimbursementTransactionId) {
      const [row] = await db
        .update(splitShares)
        .set({ status, ...(reimbursementTransactionId ? { reimbursementTransactionId } : {}) })
        .where(eq(splitShares.id, id))
        .returning();
      if (!row) throw new Error("falha ao atualizar parte do split");
      return row;
    },
    async listOwedByUser(userId) {
      const rows = await db
        .select({
          shareId: splitShares.id,
          splitId: splitShares.splitId,
          amount: splitShares.amount,
          status: splitShares.status,
          transactionDescription: transactions.description,
          creatorName: users.name,
        })
        .from(splitShares)
        .innerJoin(expenseSplits, eq(splitShares.splitId, expenseSplits.id))
        .innerJoin(transactions, eq(expenseSplits.transactionId, transactions.id))
        .innerJoin(users, eq(expenseSplits.createdBy, users.id))
        .where(and(eq(splitShares.participantUserId, userId), ne(splitShares.status, "confirmed")));
      return rows;
    },
    async listOwedToCreator(creatorId) {
      const rows = await db
        .select({
          shareId: splitShares.id,
          splitId: splitShares.splitId,
          amount: splitShares.amount,
          status: splitShares.status,
          transactionDescription: transactions.description,
          participantName: splitShares.participantName,
          participantUserName: users.name,
        })
        .from(splitShares)
        .innerJoin(expenseSplits, eq(splitShares.splitId, expenseSplits.id))
        .innerJoin(transactions, eq(expenseSplits.transactionId, transactions.id))
        .leftJoin(users, eq(splitShares.participantUserId, users.id))
        .where(and(eq(expenseSplits.createdBy, creatorId), ne(splitShares.status, "confirmed")));
      return rows.map((r) => ({
        shareId: r.shareId,
        splitId: r.splitId,
        amount: r.amount,
        status: r.status,
        transactionDescription: r.transactionDescription,
        participantName: r.participantUserName ?? r.participantName ?? "Desconhecido",
      }));
    },
  };
}
