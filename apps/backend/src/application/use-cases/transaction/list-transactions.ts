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

/**
 * `hasActiveSplit` e `invoicePaid` são computados (não são coluna da transação):
 * indicador visual de despesa dividida (M3-03) e de transação imutável por estar
 * numa fatura já paga — usado pra desabilitar a edição na UI sem precisar tentar
 * o PATCH e receber `invoice_paid` de volta.
 */
export type TransactionListItem = Transaction & {
  hasActiveSplit: boolean;
  invoicePaid: boolean;
};

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
  const invoiceIds = [
    ...new Set(rows.flatMap((r) => (r.invoiceId ? [r.invoiceId] : []))),
  ];
  const paidInvoiceIds = await deps.repos.invoice.paidInvoiceIds(invoiceIds);
  return rows.map((row) => ({
    ...row,
    hasActiveSplit: activeSplitIds.has(row.id),
    invoicePaid: row.invoiceId ? paidInvoiceIds.has(row.invoiceId) : false,
  }));
}
