import type { TransactionMethod, TransactionType } from '@finance/shared';

import { apiRequest } from '@/lib/api-client';

export interface Transaction {
  id: string;
  description: string;
  /** Centavos. */
  amount: number;
  type: TransactionType;
  method: TransactionMethod;
  /** Competência local (YYYY-MM-DD). */
  date: string;
  categoryId: string;
  /** Presente quando o método não é credit — split (M3-03) só é possível com conta de origem. */
  accountId: string | null;
  /** Presente só quando method=credit. */
  cardId: string | null;
  /** Parcela: 2 de 5, por exemplo. Null numa compra à vista/não-crédito. */
  installmentNumber: number | null;
  installmentTotal: number | null;
  /** Mesmo valor pras N parcelas de uma mesma compra — null se não for parcelado. */
  installmentGroupId: string | null;
  /** Não é a key em si, só indica se tem comprovante anexado (M3-04) — a key nunca é exposta direto. */
  attachmentKey: string | null;
  /** Computado (não é coluna) — indicador visual de despesa dividida (M3-03), só presente na listagem. */
  hasActiveSplit?: boolean;
}

export interface ListTransactionsFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  createdBy?: string;
  /** Busca por texto na descrição (max 120 chars). */
  q?: string;
  limit?: number;
  offset?: number;
  /** Quando true, lista apenas transações excluídas (soft delete) em vez das ativas. */
  deletedOnly?: boolean;
}

export interface CreateTransactionInput {
  description: string;
  /** Centavos. */
  amount: number;
  type: TransactionType;
  method: TransactionMethod;
  date: string;
  categoryId: string;
  accountId?: string;
  cardId?: string;
  /** Só method=credit; 1 = à vista (default no backend se omitido). */
  installments?: number;
}

export interface UpdateTransactionInput {
  description?: string;
  /** Centavos. */
  amount?: number;
  categoryId?: string;
  date?: string;
  /** Só method pix/debit/cash (não credit, não transfer). */
  accountId?: string;
  /** Só method credit e transação avulsa (parcela mantém o cartão travado). */
  cardId?: string;
}

export const transactionsApi = {
  list: (workspaceId: string, filters: ListTransactionsFilters = {}) => {
    const query = new URLSearchParams(
      Object.entries(filters).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, String(value)]]
      )
    ).toString();
    return apiRequest<Transaction[]>(
      `/workspaces/${workspaceId}/transactions${query ? `?${query}` : ''}`
    );
  },

  /** Retorna um array — parcelas geram uma Transaction por parcela. */
  create: (workspaceId: string, input: CreateTransactionInput) =>
    apiRequest<Transaction[]>(`/workspaces/${workspaceId}/transactions`, {
      method: 'POST',
      body: input,
    }),

  /** Tipo/método continuam travados; conta (não-crédito) e cartão (crédito avulsa) já podem mudar. */
  update: (
    workspaceId: string,
    transactionId: string,
    input: UpdateTransactionInput
  ) =>
    apiRequest<Transaction>(
      `/workspaces/${workspaceId}/transactions/${transactionId}`,
      {
        method: 'PATCH',
        body: input,
      }
    ),

  /** Edita o valor TOTAL de uma compra parcelada — redivide só entre as parcelas ainda não pagas. */
  updateInstallmentTotal: (
    workspaceId: string,
    transactionId: string,
    newTotalAmount: number
  ) =>
    apiRequest<Transaction[]>(
      `/workspaces/${workspaceId}/transactions/${transactionId}/installment-total`,
      {
        method: 'PATCH',
        body: { newTotalAmount },
      }
    ),

  /** Soft delete — some da listagem, mas pode ser restaurada. */
  delete: (workspaceId: string, transactionId: string) =>
    apiRequest<void>(
      `/workspaces/${workspaceId}/transactions/${transactionId}`,
      {
        method: 'DELETE',
      }
    ),

  restore: (workspaceId: string, transactionId: string) =>
    apiRequest<Transaction>(
      `/workspaces/${workspaceId}/transactions/${transactionId}/restore`,
      {
        method: 'POST',
      }
    ),
};
