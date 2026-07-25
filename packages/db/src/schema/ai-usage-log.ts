import { relations } from 'drizzle-orm';
import { index, integer, pgTable, smallint, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './helpers';
import { users } from './user';

/**
 * Log de uso de IA por chamada (M4-09) — alimenta a métrica de gasto de
 * tokens por camada do painel de superadmin. `layer` só existe pra 1
 * (roteador barato) e 2 (agente analítico); a camada 0 é determinística e
 * nunca aparece aqui (custo zero, sem chamada de IA).
 */
export const aiUsageLogs = pgTable(
  'ai_usage_logs',
  {
    id: id(),
    /** Null = usuário excluído (LGPD, mesmo padrão de admin_audit_logs). */
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    layer: smallint('layer').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('ai_usage_logs_created_at_idx').on(t.createdAt)]
);

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLogs.userId],
    references: [users.id],
  }),
}));

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert;
