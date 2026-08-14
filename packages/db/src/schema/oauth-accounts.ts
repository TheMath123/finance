import { relations } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './helpers';
import { users } from './user';

/**
 * Login social (Google, e futuramente outros) — tabela separada de `users`
 * (em vez de colunas nela) de propósito: permite a mesma conta linkar mais
 * de um provedor (Google + Apple + senha) ao longo do tempo. `provider` é
 * texto livre com allowlist no Zod, não `pgEnum` — evita `ALTER TYPE` toda
 * vez que um provedor novo entrar.
 */
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    /** Claim `sub` do Google — identificador estável da conta, nunca muda (ao contrário do e-mail). */
    providerAccountId: text('provider_account_id').notNull(),
    /** E-mail no momento do vínculo — informativo, nunca usado pra decisão de auth depois do vínculo criado. */
    email: text('email').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('oauth_accounts_provider_account_idx').on(
      t.provider,
      t.providerAccountId
    ),
    // Impede um mesmo usuário linkar duas contas Google diferentes ao mesmo
    // tempo (M5-07, vínculo pelo perfil) — sem isso o banco não garante nada
    // além de "esse Google não está linkado a mais ninguém".
    uniqueIndex('oauth_accounts_user_provider_idx').on(t.userId, t.provider),
    index('oauth_accounts_user_idx').on(t.userId),
  ]
);

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}));

export type OauthAccount = typeof oauthAccounts.$inferSelect;
export type NewOauthAccount = typeof oauthAccounts.$inferInsert;
