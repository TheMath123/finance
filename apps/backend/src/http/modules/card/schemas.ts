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

export const listInvoicesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const payInvoiceSchema = z.object({
  accountId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(['pix', 'debit']),
});

/** Campos que acompanham o arquivo no multipart do preview (chegam como string). */
export const csvImportPreviewFieldsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const csvImportRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  /** Centavos, com sinal (negativo = estorno/reembolso) — mesma convenção do preview. */
  amount: z.number().int(),
  categoryId: z.string().uuid(),
  installment: z
    .object({
      number: z.number().int().min(1),
      total: z.number().int().min(2).max(48),
    })
    .nullable(),
});

export const confirmInvoiceCsvImportSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  rows: z.array(csvImportRowSchema).min(1).max(500),
});
