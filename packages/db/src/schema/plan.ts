import type { PaymentMethod, PlanLimits } from '@finance/shared';
import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';

export const billingIntervalEnum = pgEnum('billing_interval', [
  'day',
  'week',
  'month',
  'year',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card',
  'debit_card',
  'pix',
]);

/**
 * M5-02 — substitui o antigo enum `workspace_plan` fixo (`free`/`premium`)
 * por uma tabela editável pelo superadmin (mesma lógica do M4-08
 * `default_categories`: configuração, não código espalhado). `key` é o
 * identificador estável referenciado por `workspaces.planId`; `isActive`
 * permite aposentar um plano sem quebrar workspaces que já estão nele
 * (por isso não há hard delete, só `setActive(false)`).
 *
 * M5-03 — preço deixou de ser coluna fixa daqui: um plano pode ter várias
 * opções de cobrança (ver `planPrices` abaixo). `trialDays` (0 = sem trial)
 * é quantos dias de acesso completo ao plano o workspace ganha antes de,
 * sem confirmação de pagamento, os checks de limite/feature caírem pro
 * plano free automaticamente (`resolveEffectivePlan`, baseado em tempo,
 * sem depender de saber status real de pagamento).
 */
export const plans = pgTable('plans', {
  id: id(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  trialDays: integer('trial_days').notNull().default(0),
  /** M5-05: id do Product no Stripe — criado lazy no primeiro checkout desse plano (nunca em massa). */
  stripeProductId: text('stripe_product_id'),
  limits: jsonb('limits').$type<PlanLimits>().notNull(),
  features: jsonb('features').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  /**
   * Planos privados: sob medida pra um workspace específico (regras/preço
   * customizados), nunca listado no catálogo de auto-atendimento
   * (`listActive`) e nunca assinável via checkout — só o superadmin vincula,
   * via `/saas/workspaces`. Sem `.references()` de propósito: `workspace.ts`
   * já importa este arquivo (`workspaces.planId` → `plans.id`), então uma FK
   * de volta pra `workspaces` aqui criaria um ciclo de tipos que o `tsc` não
   * resolve (`implicitly has type 'any'`); a integridade referencial desse
   * campo é garantida em SQL puro na própria migration, não no schema Drizzle.
   */
  restrictedToWorkspaceId: uuid('restricted_to_workspace_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * M5-03 — opções de cobrança de um plano (ex.: Started mensal/semestral/anual,
 * cada uma com seu preço). `maxInstallments` só vale de fato pro método
 * `credit_card`; `paymentMethods` guarda quais dos 3 métodos essa opção
 * aceita (hoje só metadado de exibição, sem gateway real integrado).
 * `isDefault` marca a opção pré-selecionada nas telas; a unicidade de
 * intervalo evita duas opções "mensal" duplicadas pro mesmo plano.
 */
export const planPrices = pgTable(
  'plan_prices',
  {
    id: id(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    billingIntervalUnit: billingIntervalEnum('billing_interval_unit').notNull(),
    billingIntervalCount: integer('billing_interval_count')
      .notNull()
      .default(1),
    priceCents: bigint('price_cents', { mode: 'number' }).notNull(),
    maxInstallments: integer('max_installments').notNull().default(1),
    paymentMethods: jsonb('payment_methods')
      .$type<PaymentMethod[]>()
      .notNull()
      .default(['credit_card', 'debit_card', 'pix']),
    isDefault: boolean('is_default').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    /** M5-05: id do Price no Stripe — criado lazy no primeiro checkout dessa opção de preço. */
    stripePriceId: text('stripe_price_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('plan_prices_plan_interval_key').on(
      t.planId,
      t.billingIntervalUnit,
      t.billingIntervalCount
    ),
  ]
);

export const plansRelations = relations(plans, ({ many }) => ({
  prices: many(planPrices),
}));

export const planPricesRelations = relations(planPrices, ({ one }) => ({
  plan: one(plans, { fields: [planPrices.planId], references: [plans.id] }),
}));

export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
export type PlanPriceRow = typeof planPrices.$inferSelect;
export type NewPlanPriceRow = typeof planPrices.$inferInsert;
