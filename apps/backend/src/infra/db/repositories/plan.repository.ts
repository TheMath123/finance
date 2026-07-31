import { planPrices, plans, workspaces } from '@finance/db';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type {
  Plan,
  PlanRepository,
} from '../../../application/ports/plan-repository';
import type { DbHandle } from '../handle';

const withPrices = { prices: true } as const;

function sortPrices<T extends Pick<Plan, 'prices'>>(plan: T): T {
  return {
    ...plan,
    prices: [...plan.prices].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function createPlanRepository(db: DbHandle): PlanRepository {
  return {
    async list() {
      const rows = await db.query.plans.findMany({
        orderBy: asc(plans.sortOrder),
        with: withPrices,
      });
      return rows.map(sortPrices);
    },
    async listActive() {
      const rows = await db.query.plans.findMany({
        where: eq(plans.isActive, true),
        orderBy: asc(plans.sortOrder),
        with: withPrices,
      });
      return rows.map(sortPrices);
    },
    async findById(id) {
      const row = await db.query.plans.findFirst({
        where: eq(plans.id, id),
        with: withPrices,
      });
      return row && sortPrices(row);
    },
    async findByKey(key) {
      const row = await db.query.plans.findFirst({
        where: eq(plans.key, key),
        with: withPrices,
      });
      return row && sortPrices(row);
    },
    async create(data) {
      const [row] = await db.insert(plans).values(data).returning();
      if (!row) throw new Error('falha ao criar plano');
      return { ...row, prices: [] };
    },
    async update(id, patch) {
      const [row] = await db
        .update(plans)
        .set(patch)
        .where(eq(plans.id, id))
        .returning();
      if (!row) throw new Error('falha ao atualizar plano');
      const updated = await db.query.plans.findFirst({
        where: eq(plans.id, id),
        with: withPrices,
      });
      return updated ? sortPrices(updated) : { ...row, prices: [] };
    },
    async setActive(id, isActive) {
      const [row] = await db
        .update(plans)
        .set({ isActive })
        .where(eq(plans.id, id))
        .returning();
      if (!row) throw new Error('falha ao atualizar plano');
      const updated = await db.query.plans.findFirst({
        where: eq(plans.id, id),
        with: withPrices,
      });
      return updated ? sortPrices(updated) : { ...row, prices: [] };
    },
    async countWorkspacesUsingPlan(id) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaces)
        .where(eq(workspaces.planId, id));
      return row?.count ?? 0;
    },
    async addPrice(planId, data) {
      const [row] = await db
        .insert(planPrices)
        .values({ ...data, planId })
        .returning();
      if (!row) throw new Error('falha ao criar opção de preço');
      return row;
    },
    async updatePrice(priceId, patch) {
      const [row] = await db
        .update(planPrices)
        .set(patch)
        .where(eq(planPrices.id, priceId))
        .returning();
      if (!row) throw new Error('falha ao atualizar opção de preço');
      return row;
    },
    async deletePrice(priceId) {
      await db.delete(planPrices).where(eq(planPrices.id, priceId));
    },
    findPriceById: (priceId) =>
      db.query.planPrices.findFirst({ where: eq(planPrices.id, priceId) }),
    async clearDefaultPrice(planId, exceptPriceId) {
      await db
        .update(planPrices)
        .set({ isDefault: false })
        .where(
          exceptPriceId
            ? and(
                eq(planPrices.planId, planId),
                ne(planPrices.id, exceptPriceId)
              )
            : eq(planPrices.planId, planId)
        );
    },
    async countPricesForPlan(planId) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(planPrices)
        .where(eq(planPrices.planId, planId));
      return row?.count ?? 0;
    },
    async setStripeProductId(planId, stripeProductId) {
      await db
        .update(plans)
        .set({ stripeProductId })
        .where(eq(plans.id, planId));
    },
    async setStripePriceId(priceId, stripePriceId) {
      await db
        .update(planPrices)
        .set({ stripePriceId })
        .where(eq(planPrices.id, priceId));
    },
    findPriceByStripePriceId: (stripePriceId) =>
      db.query.planPrices.findFirst({
        where: eq(planPrices.stripePriceId, stripePriceId),
      }),
  };
}
