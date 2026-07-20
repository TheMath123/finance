import { apiRequest, apiRequestUpload } from "@/lib/api-client";

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

export const attachmentApi = {
  upload: (workspaceId: string, transactionId: string, file: PickedFile) =>
    apiRequestUpload<{ attachmentKey: string }>(
      `/workspaces/${workspaceId}/transactions/${transactionId}/attachment`,
      file,
    ),

  getUrl: (workspaceId: string, transactionId: string) =>
    apiRequest<{ url: string }>(`/workspaces/${workspaceId}/transactions/${transactionId}/attachment`),

  delete: (workspaceId: string, transactionId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/transactions/${transactionId}/attachment`, {
      method: "DELETE",
    }),
};
