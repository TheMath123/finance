import { apiRequest, apiRequestUpload } from "@/lib/api-client";

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

export const attachmentApi = {
  upload: (workspaceId: string, transactionId: string, file: PickedFile) => {
    const formData = new FormData();
    // React Native aceita esse shape de objeto direto no FormData (não é o File do DOM).
    formData.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    return apiRequestUpload<{ attachmentKey: string }>(
      `/workspaces/${workspaceId}/transactions/${transactionId}/attachment`,
      formData,
    );
  },

  getUrl: (workspaceId: string, transactionId: string) =>
    apiRequest<{ url: string }>(`/workspaces/${workspaceId}/transactions/${transactionId}/attachment`),

  delete: (workspaceId: string, transactionId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/transactions/${transactionId}/attachment`, {
      method: "DELETE",
    }),
};
