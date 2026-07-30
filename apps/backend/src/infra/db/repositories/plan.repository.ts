import { plans, workspaces } from '@finance/db';
import { asc, eq, sql } from 'drizzle-orm';
import type { PlanRepository } from '../../../application/ports/plan-repository';
import type { DbHandle } from '../handle';

export function createPlanRepository(db: DbHandle): PlanRepository {
  return {
    list: () => db.query.plans.findMany({ orderBy: asc(plans.sortOrder) }),
    listActive: () =>
      db.query.plans.findMany({
        where: eq(plans.isActive, true),
        orderBy: asc(plans.sortOrder),
      }),
    findById: (id) => db.query.plans.findFirst({ where: eq(plans.id, id) }),
    findByKey: (key) => db.query.plans.findFirst({ where: eq(plans.key, key) }),
    async create(data) {
      const [row] = await db.insert(plans).values(data).returning();
      if (!row) throw new Error('falha ao criar plano');
      return row;
    },
    async update(id, patch) {
      const [row] = await db
        .update(plans)
        .set(patch)
        .where(eq(plans.id, id))
        .returning();
      if (!row) throw new Error('falha ao atualizar plano');
      return row;
    },
    async setActive(id, isActive) {
      const [row] = await db
        .update(plans)
        .set({ isActive })
        .where(eq(plans.id, id))
        .returning();
      if (!row) throw new Error('falha ao atualizar plano');
      return row;
    },
    async countWorkspacesUsingPlan(id) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaces)
        .where(eq(workspaces.planId, id));
      return row?.count ?? 0;
    },
  };
}
