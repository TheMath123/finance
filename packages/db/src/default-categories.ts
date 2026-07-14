/**
 * Categorias padrão criadas junto com cada workspace (seed de produção, spec: Onboarding).
 * "Outros" é a fallback: não-deletável e destino de transações de categorias excluídas.
 */
export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  isFallback?: boolean;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: "Mercado", icon: "shopping-cart", color: "#22C55E" },
  { name: "Transporte", icon: "car", color: "#3B82F6" },
  { name: "Moradia", icon: "home", color: "#8B5CF6" },
  { name: "Lazer", icon: "party-popper", color: "#EC4899" },
  { name: "Saúde", icon: "heart-pulse", color: "#EF4444" },
  { name: "Educação", icon: "graduation-cap", color: "#F59E0B" },
  { name: "Assinaturas", icon: "repeat", color: "#06B6D4" },
  { name: "Salário", icon: "banknote", color: "#10B981" },
  { name: "Outros", icon: "circle-ellipsis", color: "#6B7280", isFallback: true },
] as const;
