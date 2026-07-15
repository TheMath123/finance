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
  limit?: number;
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
};
