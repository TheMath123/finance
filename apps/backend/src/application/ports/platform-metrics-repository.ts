export interface PlatformMetricsSummary {
  totalUsers: number;
  suspendedUsers: number;
  workspacesByPlan: { plan: string; count: number }[];
  workspacesByType: { type: string; count: number }[];
  transactionsThisMonth: number;
}

/**
 * Agregações globais (cross-workspace/cross-usuário) pro painel de
 * métricas do superadmin (M4-09) — não cabe nos repos de domínio
 * existentes (workspace/user/transaction), que são todos escopados por
 * workspace ou por ator autenticado.
 */
export interface PlatformMetricsRepository {
  getSummary(): Promise<PlatformMetricsSummary>;
}
