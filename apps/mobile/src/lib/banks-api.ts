import { apiRequest } from "@/lib/api-client";

export interface Bank {
  id: string;
  name: string;
  bankCode: string;
}

export interface CreateBankInput {
  name: string;
  bankCode: string;
}

export const banksApi = {
  list: (workspaceId: string) => apiRequest<Bank[]>(`/workspaces/${workspaceId}/banks`),

  create: (workspaceId: string, input: CreateBankInput) =>
    apiRequest<Bank>(`/workspaces/${workspaceId}/banks`, { method: "POST", body: input }),
};
