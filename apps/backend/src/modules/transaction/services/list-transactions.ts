import { and, desc, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";
import { transactions, type Transaction } from "@finance/db";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { normalizeDescription } from "./helpers";

export interface ListTransactionsFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  createdBy?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listTransactions(
  deps: DbDeps,
  actor: Actor,
  filters: ListTransactionsFilters,
): Promise<Transaction[]> {
  const conditions = [
    eq(transactions.workspaceId, actor.workspaceId),
    isNull(transactions.deletedAt),
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
  if (filters.q) {
    conditions.push(
      ilike(transactions.descriptionNormalized, `%${normalizeDescription(filters.q)}%`),
    );
  }

  return deps.db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit: Math.min(filters.limit ?? 50, 200),
    offset: filters.offset ?? 0,
  });
}
