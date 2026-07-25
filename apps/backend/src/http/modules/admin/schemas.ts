import { z } from 'zod';

export const userParamsSchema = z.object({
  userId: z.string().uuid(),
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

export const upsertFeatureFlagSchema = z.object({
  enabled: z.boolean(),
  description: z.string().max(200).nullable().optional(),
});
