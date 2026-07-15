import { apiRequest } from "@/lib/api-client";

export interface Bank {
  id: string;
  name: string;
  bankCode: string;
  archivedAt: string | null;
}

export interface CreateBankInput {
  name: string;
  bankCode: string;
}

export const banksApi = {
  list: (workspaceId: string) => apiRequest<Bank[]>(`/workspaces/${workspaceId}/banks`),

  create: (workspaceId: string, input: CreateBankInput) =>
    apiRequest<Bank>(`/workspaces/${workspaceId}/banks`, { method: "POST", body: input }),

  update: (workspaceId: string, bankId: string, input: Partial<CreateBankInput>) =>
    apiRequest<Bank>(`/workspaces/${workspaceId}/banks/${bankId}`, { method: "PATCH", body: input }),

  archive: (workspaceId: string, bankId: string) =>
    apiRequest<Bank>(`/workspaces/${workspaceId}/banks/${bankId}/archive`, { method: "POST" }),

  unarchive: (workspaceId: string, bankId: string) =>
    apiRequest<Bank>(`/workspaces/${workspaceId}/banks/${bankId}/unarchive`, { method: "POST" }),

  delete: (workspaceId: string, bankId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/banks/${bankId}`, { method: "DELETE" }),
};
