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
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type FeatureFlagRow = typeof featureFlags.$inferSelect;
export type NewFeatureFlagRow = typeof featureFlags.$inferInsert;
