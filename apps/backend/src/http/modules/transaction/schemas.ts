import { TRANSACTION_METHODS, TRANSACTION_TYPES } from '@finance/shared';
import { z } from 'zod';

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data no formato YYYY-MM-DD');

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});
export const transactionParamsSchema = workspaceParamsSchema.extend({
  transactionId: z.string().uuid(),
});

export const createTransactionSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  type: z.enum(TRANSACTION_TYPES),
  method: z.enum(TRANSACTION_METHODS),
  date: dateSchema,
  categoryId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  installments: z.number().int().min(1).max(48).optional(),
});

export const updateTransactionSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amount: z.number().int().positive().optional(),
  categoryId: z.string().uuid().optional(),
  date: dateSchema.optional(),
  accountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
});

export const updateInstallmentTotalSchema = z.object({
  newTotalAmount: z.number().int().positive(),
});

export const listTransactionsSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  deletedOnly: z.coerce.boolean().optional(),
});
