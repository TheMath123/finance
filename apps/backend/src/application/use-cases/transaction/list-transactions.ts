import type { Transaction } from "../../../domain/entities/transaction";
import { normalizeDescription } from "../../../domain/services/occurrence-rules";
import type { Actor, UseCaseDeps } from "../../deps";

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
  deps: UseCaseDeps,
  actor: Actor,
  filters: ListTransactionsFilters,
): Promise<Transaction[]> {
  return deps.repos.transaction.list(actor.workspaceId, {
    ...filters,
    qNormalized: filters.q ? normalizeDescription(filters.q) : undefined,
  });
}
