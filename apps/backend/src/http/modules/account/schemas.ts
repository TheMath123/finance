import { ACCOUNT_TYPES } from '@finance/shared';
import { z } from 'zod';

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});
export const accountParamsSchema = workspaceParamsSchema.extend({
  accountId: z.string().uuid(),
});

export const createAccountSchema = z.object({
  name: z.string().min(1).max(80),
  bankCode: z.string().min(1),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number().int().default(0),
});
export const updateAccountSchema = createAccountSchema.partial();

export const accountCsvImportConfirmRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  amount: z.number().int(),
  categoryId: z.string().uuid(),
});

export const confirmAccountCsvImportSchema = z.object({
  method: z.enum(['pix', 'debit', 'cash']),
  rows: z.array(accountCsvImportConfirmRowSchema).min(1).max(500),
});
