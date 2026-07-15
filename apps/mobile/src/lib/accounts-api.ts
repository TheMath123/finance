import type { AccountType } from "@finance/shared";

import { apiRequest } from "@/lib/api-client";

export interface Account {
  id: string;
  name: string;
  bankId: string;
  type: AccountType;
  /** Centavos. */
  initialBalance: number;
  /** Centavos — saldo derivado (initialBalance + transações), sempre calculado no backend. */
  balance: number;
  archivedAt: string | null;
}

export interface CreateAccountInput {
  name: string;
  bankId: string;
  type: AccountType;
  initialBalance: number;
}

export const accountsApi = {
  list: (workspaceId: string) => apiRequest<Account[]>(`/workspaces/${workspaceId}/accounts`),

  create: (workspaceId: string, input: CreateAccountInput) =>
    apiRequest<Account>(`/workspaces/${workspaceId}/accounts`, { method: "POST", body: input }),

  update: (workspaceId: string, accountId: string, input: Partial<CreateAccountInput>) =>
    apiRequest<Account>(`/workspaces/${workspaceId}/accounts/${accountId}`, {
      method: "PATCH",
      body: input,
    }),

  archive: (workspaceId: string, accountId: string) =>
    apiRequest<Account>(`/workspaces/${workspaceId}/accounts/${accountId}/archive`, { method: "POST" }),

  unarchive: (workspaceId: string, accountId: string) =>
    apiRequest<Account>(`/workspaces/${workspaceId}/accounts/${accountId}/unarchive`, { method: "POST" }),

  delete: (workspaceId: string, accountId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/accounts/${accountId}`, { method: "DELETE" }),
};
