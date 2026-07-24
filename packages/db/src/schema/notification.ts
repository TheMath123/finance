import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id } from './helpers';
import { users } from './user';
import { workspaces } from './workspace';

/**
 * Tipo extensível — cada tipo novo (M2/M2+) só precisa de um valor aqui e de
 * uma entrada em `notification_preferences` (default habilitado) por usuário.
 */
export const notificationTypeEnum = pgEnum('notification_type', [
  'workspace_invite',
  'invoice_closed',
  'invoice_due',
  'recurring_pending',
  'whatsapp_linked',
  'transfer_pending',
  'transfer_accepted',
  'split_payment_pending',
  'split_payment_paid',
  'split_reimbursement_confirmed',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    /** Notificação é sempre por usuário (nunca por workspace direto) — spec do usuário. */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Contexto opcional (a maioria dos tipos hoje é workspace-scoped). */
    workspaceId: uuid('workspace_id').references(() => workspaces.id, {
      onDelete: 'cascade',
    }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    /** Payload livre pra ação/deep-link (ex.: `{ inviteId }`, `{ cardId, invoiceId }`). */
    data: jsonb('data').$type<Record<string, unknown>>(),
    readAt: timestamp('read_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
