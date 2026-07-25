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
