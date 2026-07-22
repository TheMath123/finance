import { apiRequest } from "@/lib/api-client";

export type SplitShareStatus = "pending" | "paid" | "confirmed";

export interface CreateSplitParticipant {
  type: "user" | "external";
  contact?: string;
  name?: string;
  amount?: number;
}

export interface ExpenseSplit {
  id: string;
  transactionId: string;
  createdBy: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwedByMeShare {
  shareId: string;
  splitId: string;
  amount: number;
  status: SplitShareStatus;
  transactionDescription: string;
  creatorName: string;
}

export interface OwedToMeShare {
  shareId: string;
  splitId: string;
  amount: number;
  status: SplitShareStatus;
  transactionDescription: string;
  participantName: string;
  participantUserId: string | null;
}

export const splitApi = {
  create: (workspaceId: string, transactionId: string, participants: CreateSplitParticipant[]) =>
    apiRequest<ExpenseSplit>(`/workspaces/${workspaceId}/transactions/${transactionId}/split`, {
      method: "POST",
      body: { participants },
    }),

  cancel: (splitId: string) => apiRequest<ExpenseSplit>(`/splits/${splitId}/cancel`, { method: "POST" }),

  markPaid: (shareId: string) => apiRequest(`/split-shares/${shareId}/paid`, { method: "POST" }),

  confirm: (shareId: string) => apiRequest(`/split-shares/${shareId}/confirm`, { method: "POST" }),

  listOwedByMe: () => apiRequest<OwedByMeShare[]>("/splits/owed-by-me"),

  listOwedToMe: () => apiRequest<OwedToMeShare[]>("/splits/owed-to-me"),
};
