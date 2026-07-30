import type { PlanLimits } from '@finance/shared';
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';

export const billingIntervalEnum = pgEnum('billing_interval', [
  'day',
  'week',
  'month',
  'year',
]);

/**
 * M5-02 — substitui o antigo enum `workspace_plan` fixo (`free`/`premium`)
 * por uma tabela editável pelo superadmin (mesma lógica do M4-08
 * `default_categories`: configuração, não código espalhado). `key` é o
 * identificador estável referenciado por `workspaces.planId`; `isActive`
 * permite aposentar um plano sem quebrar workspaces que já estão nele
 * (por isso não há hard delete, só `setActive(false)`).
 */
export const plans = pgTable('plans', {
  id: id(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: bigint('price_cents', { mode: 'number' }).notNull().default(0),
  billingIntervalUnit: billingIntervalEnum('billing_interval_unit')
    .notNull()
    .default('month'),
  billingIntervalCount: integer('billing_interval_count').notNull().default(1),
  limits: jsonb('limits').$type<PlanLimits>().notNull(),
  features: jsonb('features').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
