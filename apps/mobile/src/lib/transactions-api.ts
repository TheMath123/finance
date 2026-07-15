import { apiRequest } from "@/lib/api-client";

export interface Transaction {
  id: string;
  description: string;
  /** Centavos. */
  amount: number;
  type: "income" | "expense" | "transfer";
  method: string;
  /** Competência local (YYYY-MM-DD). */
  date: string;
  categoryId: string;
}

export interface ListTransactionsFilters {
  from?: string;
  to?: string;
  limit?: number;
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
};
