import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';

/**
 * Flags simples on/off (M4-09) — sem rollout percentual/segmentação de
 * propósito (não pedido, YAGNI nesse estágio). `key` é o identificador
 * estável consultado no código via `isFeatureEnabled(key)`.
 */
export const featureFlags = pgTable('feature_flags', {
  id: id(),
  key: text('key').notNull().unique(),
  enabled: boolean('enabled').notNull().default(false),
  description: text('description'),
  /**
   * Flags predefinidas da plataforma (seed via migration, ver drizzle/ —
   * mesmo padrão de `default_categories`/`platform_settings`): nunca podem
   * ser excluídas via API/UI, só o toggle `enabled` é editável pelo
   * superadmin. `upsert` nunca escreve este campo (fora de
   * `FeatureFlagInput`, ver feature-flag-repository.ts) — só o seed decide
   * quem é `isSystem`.
   */
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type FeatureFlagRow = typeof featureFlags.$inferSelect;
export type NewFeatureFlagRow = typeof featureFlags.$inferInsert;
