import type {
  BillingInterval,
  PaymentMethod,
  PlanLimits,
} from '@finance/shared';

export interface PlanPrice {
  id: string;
  planId: string;
  billingIntervalUnit: BillingInterval;
  billingIntervalCount: number;
  priceCents: number;
  maxInstallments: number;
  paymentMethods: PaymentMethod[];
  isDefault: boolean;
  sortOrder: number;
  /** M5-05 — id do Price no Stripe, sincronizado lazy (nulo até o primeiro checkout). */
  stripePriceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanPriceInput {
  billingIntervalUnit: BillingInterval;
  billingIntervalCount: number;
  priceCents: number;
  maxInstallments: number;
  paymentMethods: PaymentMethod[];
  isDefault: boolean;
  sortOrder: number;
}

export interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  /** M5-03: dias de acesso completo ao plano antes de, sem confirmação de pagamento, cair pro free (0 = sem trial). */
  trialDays: number;
  /** M5-05 — id do Product no Stripe, sincronizado lazy (nulo até o primeiro checkout desse plano). */
  stripeProductId: string | null;
  limits: PlanLimits;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  /** M5-03: opções de cobrança do plano (mensal/semestral/anual etc.) — sempre ao menos 1. */
  prices: PlanPrice[];
}

export interface PlanInput {
  key: string;
  name: string;
  description?: string | null;
  trialDays: number;
  limits: PlanLimits;
  features: string[];
}

export interface PlanRepository {
  list(): Promise<Plan[]>;
  listActive(): Promise<Plan[]>;
  findById(id: string): Promise<Plan | undefined>;
  findByKey(key: string): Promise<Plan | undefined>;
  create(data: PlanInput): Promise<Plan>;
  update(id: string, patch: Partial<PlanInput>): Promise<Plan>;
  setActive(id: string, isActive: boolean): Promise<Plan>;
  /** Quantos workspaces estão nesse plano — usado pra decidir se dá pra desativar sem impacto visível. */
  countWorkspacesUsingPlan(id: string): Promise<number>;
  addPrice(planId: string, data: PlanPriceInput): Promise<PlanPrice>;
  updatePrice(
    priceId: string,
    patch: Partial<PlanPriceInput>
  ): Promise<PlanPrice>;
  deletePrice(priceId: string): Promise<void>;
  findPriceById(priceId: string): Promise<PlanPrice | undefined>;
  /** Zera `isDefault` de todas as outras prices do plano — usado ao marcar uma nova price como default. */
  clearDefaultPrice(planId: string, exceptPriceId?: string): Promise<void>;
  countPricesForPlan(planId: string): Promise<number>;
  /** M5-05 — grava o id sincronizado lazy no Stripe (nunca vem do CRUD admin, por isso separado de `update`/`updatePrice`). */
  setStripeProductId(planId: string, stripeProductId: string): Promise<void>;
  setStripePriceId(priceId: string, stripePriceId: string): Promise<void>;
  /** M5-05 — usado pelo webhook pra mapear o `price.id` do Stripe de volta pro nosso plan_price (troca de plano via Customer Portal). */
  findPriceByStripePriceId(
    stripePriceId: string
  ): Promise<PlanPrice | undefined>;
}
