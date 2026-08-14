import { relations } from 'drizzle-orm';
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';
import { oauthAccounts } from './oauth-accounts';
import { refreshTokens } from './refresh-token';
import { workspaces } from './workspace';
import { workspaceMembers } from './workspace-member';

export const platformRoleEnum = pgEnum('platform_role', ['user', 'superadmin']);

export const users = pgTable('users', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  /** Preenchido/verificado no vínculo do WhatsApp (M2). */
  phone: text('phone').unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  /** E-mail novo aguardando confirmação por código (troca de e-mail no perfil) — null fora do fluxo. */
  pendingEmail: text('pending_email'),
  termsAcceptedAt: timestamp('terms_accepted_at', {
    withTimezone: true,
  }).notNull(),
  termsVersion: text('terms_version').notNull(),
  platformRole: platformRoleEnum('platform_role').notNull().default('user'),
  /** Lockout progressivo de login (spec: Rate limiting). */
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  /** Suspensão administrativa (M4-08, superadmin) — distinto do lockout de senha. */
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  /** URL externa do avatar (hoje só a `picture` do Google) — nunca apagada por um upload manual, só deixa de valer enquanto `avatarKey` estiver preenchido. */
  avatarUrl: text('avatar_url'),
  /** Chave no storage S3-compatible de um avatar enviado manualmente (M5-07) — mesmo padrão de `attachmentKey`. Tem prioridade sobre `avatarUrl` quando preenchida. */
  avatarKey: text('avatar_key'),
  /** Nullable apenas pela ordem de criação (user → workspace → update); a aplicação garante preenchimento. */
  defaultWorkspaceId: uuid('default_workspace_id').references(
    () => workspaces.id
  ),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  defaultWorkspace: one(workspaces, {
    fields: [users.defaultWorkspaceId],
    references: [workspaces.id],
  }),
  memberships: many(workspaceMembers),
  refreshTokens: many(refreshTokens),
  oauthAccounts: many(oauthAccounts),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
