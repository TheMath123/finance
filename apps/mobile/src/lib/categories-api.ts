import { apiRequest } from "@/lib/api-client";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isFallback: boolean;
}

export const categoriesApi = {
  list: (workspaceId: string) => apiRequest<Category[]>(`/workspaces/${workspaceId}/categories`),
};
