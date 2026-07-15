export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  icon: string;
  color: string;
  /** "Outros": não-deletável, destino de transações de categorias excluídas. */
  isFallback: boolean;
  /** Categoria do seed (criada junto com o workspace) — não editável nem excluível pelo usuário. */
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
