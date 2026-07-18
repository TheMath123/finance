import { and, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { categories, transactions } from "@finance/db";
import type { TransactionRepository } from "../../../application/ports/transaction-repository";
import type { DbHandle } from "../handle";

export function createTransactionRepository(db: DbHandle): TransactionRepository {
  return {
    async create(draft) {
      const [row] = await db.insert(transactions).values(draft).returning();
      if (!row) throw new Error("falha ao criar transação");
      return row;
    },
    findInWorkspace: (workspaceId, id) =>
      db.query.transactions.findFirst({
        where: and(eq(transactions.id, id), eq(transactions.workspaceId, workspaceId)),
      }),
    listByGroup: (installmentGroupId) =>
      db.query.transactions.findMany({
        where: eq(transactions.installmentGroupId, installmentGroupId),
      }),
    async update(id, patch) {
      const [row] = await db
        .update(transactions)
        .set(patch)
        .where(eq(transactions.id, id))
        .returning();
      if (!row) throw new Error("falha ao atualizar transação");
      return row;
    },
    async softDelete(id) {
      await db.update(transactions).set({ deletedAt: new Date() }).where(eq(transactions.id, id));
    },
    async restore(id) {
      await db.update(transactions).set({ deletedAt: null }).where(eq(transactions.id, id));
    },
    async list(workspaceId, filters) {
      const conditions = [
        eq(transactions.workspaceId, workspaceId),
        filters.deletedOnly ? isNotNull(transactions.deletedAt) : isNull(transactions.deletedAt),
      ];
      if (filters.from) conditions.push(gte(transactions.date, filters.from));
      if (filters.to) conditions.push(lte(transactions.date, filters.to));
      if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
      if (filters.cardId) conditions.push(eq(transactions.cardId, filters.cardId));
      if (filters.createdBy) conditions.push(eq(transactions.createdBy, filters.createdBy));
      if (filters.accountId) {
        conditions.push(
          or(
            eq(transactions.accountId, filters.accountId),
            eq(transactions.toAccountId, filters.accountId),
          )!,
        );
      }
      if (filters.qNormalized) {
        conditions.push(ilike(transactions.descriptionNormalized, `%${filters.qNormalized}%`));
      }
      return db.query.transactions.findMany({
        where: and(...conditions),
        orderBy: [desc(transactions.date), desc(transactions.createdAt)],
        limit: Math.min(filters.limit ?? 50, 200),
        offset: filters.offset ?? 0,
      });
    },
    async existsByAccount(accountId) {
      const row = await db.query.transactions.findFirst({
        where: or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)),
      });
      return row !== undefined;
    },
    async existsByCard(cardId) {
      const row = await db.query.transactions.findFirst({
        where: eq(transactions.cardId, cardId),
      });
      return row !== undefined;
    },
    findByRecurringAndDate: (recurringId, date) =>
      db.query.transactions.findFirst({
        where: and(eq(transactions.recurringId, recurringId), eq(transactions.date, date)),
      }),
    async confirmedOccurrenceKeys(recurringIds) {
      if (recurringIds.length === 0) return [];
      const rows = await db
        .select({ recurringId: transactions.recurringId, date: transactions.date })
        .from(transactions)
        .where(inArray(transactions.recurringId, recurringIds));
      return rows.filter((r): r is { recurringId: string; date: string } => r.recurringId !== null);
    },
    async balanceDelta(accountId) {
      const [row] = await db
        .select({
          delta: sql<string>`COALESCE(SUM(
            CASE
              WHEN ${transactions.toAccountId} = ${accountId} THEN ${transactions.amount}
              WHEN ${transactions.method} = 'transfer' THEN -${transactions.amount}
              WHEN ${transactions.type} = 'income' THEN ${transactions.amount}
              ELSE -${transactions.amount}
            END
          ), 0)`,
        })
        .from(transactions)
        .where(
          and(
            isNull(transactions.deletedAt),
            or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)),
          ),
        );
      return Number(row?.delta ?? 0);
    },
    async reassignCategory(fromCategoryId, toCategoryId) {
      await db
        .update(transactions)
        .set({ categoryId: toCategoryId })
        .where(eq(transactions.categoryId, fromCategoryId));
    },
    async monthlyTotals(workspaceId, from, to) {
      const [row] = await db
        .select({
          income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, workspaceId),
            isNull(transactions.deletedAt),
            sql`${transactions.method} <> 'transfer'`,
            gte(transactions.date, from),
            lte(transactions.date, to),
          ),
        );
      return { income: Number(row?.income ?? 0), expense: Number(row?.expense ?? 0) };
    },
    async findMostUsedCategory(workspaceId, descriptionNormalized) {
      const [row] = await db
        .select({ categoryId: transactions.categoryId, count: sql<string>`COUNT(*)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, workspaceId),
            eq(transactions.descriptionNormalized, descriptionNormalized),
            isNull(transactions.deletedAt),
          ),
        )
        .groupBy(transactions.categoryId)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(1);
      return row?.categoryId;
    },
    async expenseByCategory(workspaceId, from, to) {
      const rows = await db
        .select({
          categoryId: transactions.categoryId,
          name: categories.name,
          color: categories.color,
          total: sql<string>`SUM(${transactions.amount})`,
        })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.workspaceId, workspaceId),
            isNull(transactions.deletedAt),
            eq(transactions.type, "expense"),
            sql`${transactions.method} <> 'transfer'`,
            gte(transactions.date, from),
            lte(transactions.date, to),
          ),
        )
        .groupBy(transactions.categoryId, categories.name, categories.color);
      return rows.map((r) => ({ ...r, total: Number(r.total) }));
    },
  };
}
