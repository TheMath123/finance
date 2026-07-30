import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';
import { plans } from './plan';
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
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  plan: one(plans, {
    fields: [workspaces.planId],
    references: [plans.id],
  }),
  members: many(workspaceMembers),
  invites: many(workspaceInvites),
}));

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
