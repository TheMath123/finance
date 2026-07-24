import { RECURRENCE_FREQUENCIES, TRANSACTION_TYPES } from '@finance/shared';
import { z } from 'zod';

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});
export const recurringParamsSchema = workspaceParamsSchema.extend({
  recurringId: z.string().uuid(),
});

export const createRecurringSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  type: z.enum(TRANSACTION_TYPES),
  /** Transferência recorrente fica fora do M1 (schema não tem conta destino). */
  method: z.enum(['pix', 'debit', 'cash', 'credit']),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  dayOfReference: z.number().int().min(0).max(31),
  monthOfReference: z.number().int().min(1).max(12).optional(),
  active: z.boolean().optional(),
});
export const updateRecurringSchema = createRecurringSchema.partial();

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const confirmOccurrenceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
