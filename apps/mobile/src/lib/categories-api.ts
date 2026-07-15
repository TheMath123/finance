import { apiRequest } from "@/lib/api-client";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isFallback: boolean;
}

export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
}

export const categoriesApi = {
  list: (workspaceId: string) => apiRequest<Category[]>(`/workspaces/${workspaceId}/categories`),

  create: (workspaceId: string, input: CategoryInput) =>
    apiRequest<Category>(`/workspaces/${workspaceId}/categories`, { method: "POST", body: input }),

  update: (workspaceId: string, categoryId: string, input: Partial<CategoryInput>) =>
    apiRequest<Category>(`/workspaces/${workspaceId}/categories/${categoryId}`, {
      method: "PATCH",
      body: input,
    }),

  delete: (workspaceId: string, categoryId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/categories/${categoryId}`, { method: "DELETE" }),
};
