import type { BillingInterval, PlanLimits } from '@finance/shared';

export interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceCents: number;
  billingIntervalUnit: BillingInterval;
  billingIntervalCount: number;
  limits: PlanLimits;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanInput {
  key: string;
  name: string;
  description?: string | null;
  priceCents: number;
  billingIntervalUnit: BillingInterval;
  billingIntervalCount: number;
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
}
