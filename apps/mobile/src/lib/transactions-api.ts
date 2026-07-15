import type { TransactionMethod, TransactionType } from "@finance/shared";

import { apiRequest } from "@/lib/api-client";

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
}

export interface UpdateTransactionInput {
  description?: string;
  /** Centavos. */
  amount?: number;
  categoryId?: string;
  date?: string;
}

export const transactionsApi = {
  list: (workspaceId: string, filters: ListTransactionsFilters = {}) => {
    const query = new URLSearchParams(
      Object.entries(filters).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])),
    ).toString();
    return apiRequest<Transaction[]>(
      `/workspaces/${workspaceId}/transactions${query ? `?${query}` : ""}`,
    );
  },

  /** Retorna um array — parcelas geram uma Transaction por parcela. */
  create: (workspaceId: string, input: CreateTransactionInput) =>
    apiRequest<Transaction[]>(`/workspaces/${workspaceId}/transactions`, {
      method: "POST",
      body: input,
    }),

  /** Só descrição, valor, categoria e data são editáveis (tipo/método/conta não). */
  update: (workspaceId: string, transactionId: string, input: UpdateTransactionInput) =>
    apiRequest<Transaction>(`/workspaces/${workspaceId}/transactions/${transactionId}`, {
      method: "PATCH",
      body: input,
    }),

  /** Soft delete — some da listagem, mas pode ser restaurada. */
  delete: (workspaceId: string, transactionId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/transactions/${transactionId}`, {
      method: "DELETE",
    }),

  restore: (workspaceId: string, transactionId: string) =>
    apiRequest<Transaction>(`/workspaces/${workspaceId}/transactions/${transactionId}/restore`, {
      method: "POST",
    }),
};
