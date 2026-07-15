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
};
