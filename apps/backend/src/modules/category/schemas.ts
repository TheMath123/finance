import { z } from "zod";

export const workspaceParamsSchema = z.object({ workspaceId: z.string().uuid() });
export const categoryParamsSchema = workspaceParamsSchema.extend({
  categoryId: z.string().uuid(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
