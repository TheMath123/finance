import { plans, transactions, users, workspaces } from '@finance/db';
import { and, count, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';
import type { PlatformMetricsRepository } from '../../../application/ports/platform-metrics-repository';
import type { DbHandle } from '../handle';

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function createPlatformMetricsRepository(
  db: DbHandle
): PlatformMetricsRepository {
  return {
    async getSummary() {
      const { from, to } = currentMonthRange();

      const [
        [totalUsersRow],
        [suspendedUsersRow],
        workspacesByPlan,
        workspacesByType,
        [transactionsRow],
      ] = await Promise.all([
        db.select({ value: count() }).from(users),
        db
          .select({ value: count() })
          .from(users)
          .where(isNotNull(users.suspendedAt)),
        db
          .select({ plan: plans.key, count: count() })
          .from(workspaces)
          .innerJoin(plans, eq(workspaces.planId, plans.id))
          .groupBy(plans.key),
        db
          .select({ type: workspaces.type, count: count() })
          .from(workspaces)
          .groupBy(workspaces.type),
        db
          .select({ value: count() })
          .from(transactions)
          .where(
            and(
              gte(transactions.date, from),
              lte(transactions.date, to),
              isNull(transactions.deletedAt)
            )
          ),
      ]);

      return {
        totalUsers: totalUsersRow?.value ?? 0,
        suspendedUsers: suspendedUsersRow?.value ?? 0,
        workspacesByPlan,
        workspacesByType,
        transactionsThisMonth: transactionsRow?.value ?? 0,
      };
    },
  };
}
