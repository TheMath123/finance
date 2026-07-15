export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  icon: string;
  color: string;
  /** "Outros": não-deletável, destino de transações de categorias excluídas. */
  isFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
}
