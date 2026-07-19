import { apiRequest } from "@/lib/api-client";
import type { AcceptTransferInput, CreateTransferInput } from "@/lib/schemas/finance";

export type TransferStatus = "pending" | "accepted" | "rejected" | "expired";

export interface Transfer {
  id: string;
  fromTransactionId: string;
  toTransactionId: string | null;
  amount: number;
  description: string;
  status: TransferStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingTransfer {
  id: string;
  amount: number;
  description: string;
  expiresAt: string;
  createdAt: string;
  fromUserName: string;
}

export interface TransferAccountOption {
  accountId: string;
  accountName: string;
  workspaceId: string;
  workspaceName: string;
}

export interface TrustedContact {
  id: string;
  userId: string;
  trustedUserId: string;
  defaultAccountId: string;
  createdAt: string;
  trustedUserName: string;
}

export const transferApi = {
  create: (workspaceId: string, input: CreateTransferInput) =>
    apiRequest<Transfer>(`/workspaces/${workspaceId}/transfers`, { method: "POST", body: input }),

  listPending: () => apiRequest<PendingTransfer[]>("/transfers/pending"),

  /** Contas do usuário logado em qualquer workspace seu — escolha de destino no aceite. */
  listAccounts: () => apiRequest<TransferAccountOption[]>("/transfers/accounts"),

  accept: (transferId: string, input: AcceptTransferInput) =>
    apiRequest<Transfer>(`/transfers/${transferId}/accept`, { method: "POST", body: input }),

  reject: (transferId: string) => apiRequest<Transfer>(`/transfers/${transferId}/reject`, { method: "POST" }),

  listTrustedContacts: () => apiRequest<TrustedContact[]>("/trusted-contacts"),

  removeTrustedContact: (id: string) => apiRequest<void>(`/trusted-contacts/${id}`, { method: "DELETE" }),
};
