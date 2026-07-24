import { z } from 'zod';

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});
export const cardParamsSchema = workspaceParamsSchema.extend({
  cardId: z.string().uuid(),
});
export const invoiceParamsSchema = workspaceParamsSchema.extend({
  invoiceId: z.string().uuid(),
});

export const createCardSchema = z.object({
  name: z.string().min(1).max(80),
  bankCode: z.string().min(1),
  limit: z.number().int().positive(),
  closingDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
});
export const updateCardSchema = createCardSchema.partial();

export const payInvoiceSchema = z.object({
  accountId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(['pix', 'debit']),
});
