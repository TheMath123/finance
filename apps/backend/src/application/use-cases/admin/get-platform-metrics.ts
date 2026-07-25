import type { UseCaseDeps } from '../../deps';

const AI_USAGE_WINDOW_DAYS = 30;

export interface PlatformMetrics {
  totalUsers: number;
  suspendedUsers: number;
  workspacesByPlan: { plan: string; count: number }[];
  workspacesByType: { type: string; count: number }[];
  transactionsThisMonth: number;
  /** Últimos 30 dias — camada 0 (determinística) nunca aparece aqui, custo zero. */
  aiUsageByLayer: {
    layer: number;
    callCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  }[];
}

export async function getPlatformMetrics(
  deps: Pick<UseCaseDeps, 'repos'>
): Promise<PlatformMetrics> {
  const since = new Date(
    Date.now() - AI_USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const [summary, aiUsageByLayer] = await Promise.all([
    deps.repos.platformMetrics.getSummary(),
    deps.repos.aiUsageLog.aggregateByLayerSince(since),
  ]);

  return { ...summary, aiUsageByLayer };
}
