import { aiUsageLogs } from '@finance/db';
import { count, gte, sql } from 'drizzle-orm';
import type { AiUsageLogRepository } from '../../../application/ports/ai-usage-log-repository';
import type { DbHandle } from '../handle';

export function createAiUsageLogRepository(db: DbHandle): AiUsageLogRepository {
  return {
    async record(entry) {
      await db.insert(aiUsageLogs).values(entry);
    },
    async aggregateByLayerSince(since) {
      const rows = await db
        .select({
          layer: aiUsageLogs.layer,
          callCount: count(),
          totalInputTokens: sql<string>`COALESCE(SUM(${aiUsageLogs.inputTokens}), 0)`,
          totalOutputTokens: sql<string>`COALESCE(SUM(${aiUsageLogs.outputTokens}), 0)`,
        })
        .from(aiUsageLogs)
        .where(gte(aiUsageLogs.createdAt, since))
        .groupBy(aiUsageLogs.layer)
        .orderBy(aiUsageLogs.layer);

      return rows.map((r) => ({
        layer: r.layer,
        callCount: r.callCount,
        totalInputTokens: Number(r.totalInputTokens),
        totalOutputTokens: Number(r.totalOutputTokens),
      }));
    },
  };
}
