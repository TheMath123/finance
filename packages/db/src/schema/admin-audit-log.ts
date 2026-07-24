import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './helpers';
import { users } from './user';

/**
 * Auditoria de ações administrativas (superadmin) — separada do `audit_logs`
 * de workspace (spec, M4-07: "ações administrativas são registradas em
 * auditoria própria"). `action`/`entity` ficam livres (texto) em vez de enum:
 * o conjunto de ações administrativas cresce a cada milestone de superadmin
 * (M4-08: suspender usuário, mudar categoria padrão; M4-09: orçamento de IA,
 * feature flag) e um enum exigiria migration nova a cada uma.
 */
export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: id(),
    /** Null = admin excluído (anonimizado, LGPD, mesmo padrão do audit_logs de workspace). */
    adminUserId: uuid('admin_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    /** Nome do recurso afetado (ex.: "user", "category", "feature_flag"). */
    entity: text('entity').notNull(),
    /** Não é sempre um UUID (ex.: chave de feature flag) — texto livre. */
    entityId: text('entity_id'),
    /** Detalhes da ação (ex.: valores antes/depois), quando fizer sentido. */
    metadata: jsonb('metadata'),
    createdAt: createdAt(),
  },
  (t) => [index('admin_audit_logs_created_at_idx').on(t.createdAt)]
);

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  adminUser: one(users, {
    fields: [adminAuditLogs.adminUserId],
    references: [users.id],
  }),
}));

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
