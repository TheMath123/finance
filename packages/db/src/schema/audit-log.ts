import { relations } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './helpers';
import { users } from './user';
import { workspaces } from './workspace';

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'restore',
]);

/**
 * Auditoria de mutações por workspace.
 * M1: write-only (hook genérico na camada de service). M2: endpoint + tela de atividade.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    /** Null = usuário excluído (anonimizado, LGPD). */
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: auditActionEnum('action').notNull(),
    /** Nome do model (ex.: "transaction", "card"). */
    entity: text('entity').notNull(),
    entityId: uuid('entity_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('audit_logs_workspace_idx').on(t.workspaceId, t.createdAt)]
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
