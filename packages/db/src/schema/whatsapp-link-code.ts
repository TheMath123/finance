import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './helpers';
import { users } from './user';

/**
 * Código OTP de vínculo do WhatsApp (spec: "Vínculo do WhatsApp por OTP").
 * Sem coluna `attempts`: o número remetente só é conhecido quando a mensagem
 * chega (é o próprio dado sendo vinculado), então a checagem de força bruta
 * não tem como incrementar um contador nesta linha antes de bater o hash —
 * o rate limit de tentativas de confirmação é por telefone remetente
 * (`deps.rateLimiter`, ver `confirm-link.ts`), mesmo padrão já usado no
 * reset de senha por código.
 */
export const whatsappLinkCodes = pgTable(
  'whatsapp_link_codes',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('whatsapp_link_codes_user_idx').on(t.userId),
    // Busca não escopada por usuário: o vínculo nasce da mensagem, o remetente
    // (logo o userId) só é descoberto depois de achar o hash correspondente.
    index('whatsapp_link_codes_hash_idx').on(t.codeHash),
  ]
);

export const whatsappLinkCodesRelations = relations(
  whatsappLinkCodes,
  ({ one }) => ({
    user: one(users, {
      fields: [whatsappLinkCodes.userId],
      references: [users.id],
    }),
  })
);

export type WhatsAppLinkCode = typeof whatsappLinkCodes.$inferSelect;
export type NewWhatsAppLinkCode = typeof whatsappLinkCodes.$inferInsert;
