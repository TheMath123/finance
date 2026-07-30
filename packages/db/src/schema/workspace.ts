import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';
import { planPrices, plans } from './plan';
import { workspaceInvites } from './workspace-invite';
import { workspaceMembers } from './workspace-member';

export const workspaceTypeEnum = pgEnum('workspace_type', [
  'personal',
  'family',
  'business',
]);

export const workspaces = pgTable('workspaces', {
  id: id(),
  name: text('name').notNull(),
  type: workspaceTypeEnum('type').notNull(),
  /** M5-02: substitui o antigo enum `workspace_plan` — ver `packages/db/src/schema/plan.ts`. */
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),
  /** M5-03: qual opção de cobrança (recorrência) do plano atual — nullable, exibição usa o preço default do plano se vazio. */
  planPriceId: uuid('plan_price_id').references(() => planPrices.id, {
    onDelete: 'set null',
  }),
  /** M5-03: nulo = sem trial ativo; no passado = trial expirado (checks de limite/feature caem pro plano free — `resolveEffectivePlan`). */
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  plan: one(plans, {
    fields: [workspaces.planId],
    references: [plans.id],
  }),
  planPrice: one(planPrices, {
    fields: [workspaces.planPriceId],
    references: [planPrices.id],
  }),
  members: many(workspaceMembers),
  invites: many(workspaceInvites),
}));

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
