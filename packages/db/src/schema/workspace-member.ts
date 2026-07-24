import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';
import { users } from './user';
import { workspaces } from './workspace';

export const workspaceRoleEnum = pgEnum('workspace_role', [
  'owner',
  'admin',
  'member',
  'viewer',
]);

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('workspace_members_unique_idx').on(t.workspaceId, t.userId),
  ]
);

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  })
);

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
