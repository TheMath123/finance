import { useQuery } from '@tanstack/react-query';

import { categoriesApi } from '@/lib/categories-api';

/** Categorias do workspace atual — compartilhado entre forms de criar/editar transação e filtros. */
export function useCategories(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => categoriesApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}
