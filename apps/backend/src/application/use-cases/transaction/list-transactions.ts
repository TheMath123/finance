import type { Transaction } from '../../../domain/entities/transaction';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import type { Actor, UseCaseDeps } from '../../deps';

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
  deletedOnly?: boolean;
}

/** `hasActiveSplit` é computado (não é coluna da transação) — indicador visual de que a despesa está dividida (M3-03). */
export type TransactionListItem = Transaction & { hasActiveSplit: boolean };

export async function listTransactions(
  deps: UseCaseDeps,
  actor: Actor,
  filters: ListTransactionsFilters
): Promise<TransactionListItem[]> {
  const rows = await deps.repos.transaction.list(actor.workspaceId, {
    ...filters,
    qNormalized: filters.q ? normalizeDescription(filters.q) : undefined,
  });
  const activeSplitIds = await deps.repos.expenseSplit.activeTransactionIds(
    rows.map((r) => r.id)
  );
  return rows.map((row) => ({
    ...row,
    hasActiveSplit: activeSplitIds.has(row.id),
  }));
}
