import { SAVED_FORMULA_DISPLAY_FORMATS } from '@finance/shared';
import { z } from 'zod';

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});
export const formulaParamsSchema = workspaceParamsSchema.extend({
  formulaId: z.string().uuid(),
});

/** Ano/mês opcionais — sem eles, avalia pro mês corrente (mesmo default da Home). */
export const periodQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const createSavedFormulaSchema = z.object({
  name: z.string().min(1).max(80),
  expression: z.string().min(1).max(500),
  displayFormat: z.enum(SAVED_FORMULA_DISPLAY_FORMATS),
  pinnedHome: z.boolean(),
  pinnedTransactions: z.boolean(),
});
export const updateSavedFormulaSchema = createSavedFormulaSchema.partial();

export const reorderSavedFormulasSchema = z.object({
  field: z.enum(['home', 'transactions']),
  formulaIds: z.array(z.string().uuid()).min(1),
});
