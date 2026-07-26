/**
 * Limites do plano `free` (spec: Planos e limites — "valores generosos por
 * ora... valores são configuração, não código espalhado"). `premium` não tem
 * limite nenhum — cobrança/upgrade real é milestone futuro, então hoje só
 * existe workspace `free` na prática.
 */
export const FREE_PLAN_LIMITS = {
  /** Quantos workspaces compartilhados (family/business) um usuário pode possuir (ser owner). */
  maxOwnedSharedWorkspaces: 1,
  /** Quantos membros um workspace free pode ter no total. */
  maxMembersPerWorkspace: 5,
  /** Quantas fórmulas customizadas (M5-01) um workspace free pode salvar. */
  maxSavedFormulasPerWorkspace: 10,
} as const;
