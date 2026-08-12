import { BILLING_INTERVALS, PAYMENT_METHODS } from '@finance/shared';
import { z } from 'zod';

export const userParamsSchema = z.object({
  userId: z.string().uuid(),
});

export const planParamsSchema = z.object({
  id: z.string().uuid(),
});

export const planPriceParamsSchema = z.object({
  id: z.string().uuid(),
  priceId: z.string().uuid(),
});

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const listWorkspacesQuerySchema = z.object({
  search: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const planLimitsSchema = z.object({
  maxOwnedSharedWorkspaces: z.number().int().min(0),
  maxMembersPerWorkspace: z.number().int().min(1),
  maxSavedFormulasPerWorkspace: z.number().int().min(0),
});

export const createPlanSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, 'Use só letras minúsculas, números, "_" ou "-".'),
  name: z.string().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  trialDays: z.number().int().min(0).max(365),
  limits: planLimitsSchema,
  features: z.array(z.string().min(1).max(80)).default([]),
});

export const updatePlanSchema = createPlanSchema.omit({ key: true }).partial();

export const createPlanPriceSchema = z.object({
  billingIntervalUnit: z.enum(BILLING_INTERVALS),
  billingIntervalCount: z.number().int().min(1).max(36),
  priceCents: z.number().int().min(0),
  maxInstallments: z.number().int().min(1).max(12).default(1),
  paymentMethods: z
    .array(z.enum(PAYMENT_METHODS))
    .min(1)
    .default([...PAYMENT_METHODS]),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const updatePlanPriceSchema = createPlanPriceSchema.partial();

export const setWorkspacePlanSchema = z.object({
  planId: z.string().uuid(),
  planPriceId: z.string().uuid().optional(),
});

export const defaultCategoryParamsSchema = z.object({
  categoryId: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  search: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createDefaultCategorySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isFallback: z.boolean().default(false),
});

export const updateDefaultCategorySchema =
  createDefaultCategorySchema.partial();

export const updateAiSettingsSchema = z.object({
  dailyTokenBudgetPerUser: z.number().int().positive().max(10_000_000),
});

export const featureFlagParamsSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_-]+$/, 'Use só letras minúsculas, números, "_" ou "-".'),
});

export const updateFeatureFlagSchema = z.object({
  enabled: z.boolean(),
});
