import { relations } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id } from './helpers';
import { users } from './user';

/**
 * Mesmo mecanismo para reset de senha, verificação de e-mail, troca de e-mail e
 * exclusão de conta no perfil (ver spec: Segurança > Cadastro). `email_change` e
 * `account_deletion` reaproveitam o código de 6 dígitos (igual ao password_reset)
 * — o e-mail novo fica em `users.pending_email` até a confirmação da troca (ver
 * schema de `users`); a exclusão não precisa de campo pendente, só do código.
 */
export const authTokenPurposeEnum = pgEnum('auth_token_purpose', [
  'password_reset',
  'email_verification',
  'email_change',
  'account_deletion',
]);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: authTokenPurposeEnum('purpose').notNull(),
    // Sem unique(): password_reset agora usa código curto (6 dígitos), então o hash
    // sozinho não é globalmente único (colisão entre usuários é esperada). A busca
    // sempre escopa por userId também (findValidAuthTokenForUser).
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('auth_tokens_user_purpose_idx').on(t.userId, t.purpose),
    index('auth_tokens_user_purpose_hash_idx').on(
      t.userId,
      t.purpose,
      t.tokenHash
    ),
  ]
);

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, { fields: [authTokens.userId], references: [users.id] }),
}));

export type AuthToken = typeof authTokens.$inferSelect;
export type NewAuthToken = typeof authTokens.$inferInsert;
