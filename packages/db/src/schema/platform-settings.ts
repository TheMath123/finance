import { integer, pgTable } from 'drizzle-orm/pg-core';
import { id, updatedAt } from './helpers';

/**
 * Configuração global editável pelo superadmin (M4-09) — singleton (uma
 * única linha, sempre a mais antiga). Antes vivia hardcoded
 * (`DAILY_TOKEN_BUDGET_PER_USER` em `redis-token-budget.ts`); migrado pra
 * cá pra virar editável em runtime sem redeploy.
 */
export const platformSettings = pgTable('platform_settings', {
  id: id(),
  dailyTokenBudgetPerUser: integer('daily_token_budget_per_user')
    .notNull()
    .default(100_000),
  updatedAt: updatedAt(),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type NewPlatformSettings = typeof platformSettings.$inferInsert;
