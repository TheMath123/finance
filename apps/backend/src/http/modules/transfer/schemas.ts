import { z } from "zod";
import { emailOrPhoneSchema } from "@finance/shared";

export const workspaceParamsSchema = z.object({ workspaceId: z.string().uuid() });
export const transferParamsSchema = z.object({ id: z.string().uuid() });
export const trustedContactParamsSchema = z.object({ id: z.string().uuid() });

export const createTransferSchema = z.object({
  /** Telefone ou e-mail de um usuário existente na plataforma. */
  recipient: emailOrPhoneSchema,
  /** Centavos. */
  amount: z.number().int().positive(),
  description: z.string().min(1).max(200),
  accountId: z.string().uuid(),
});

export const acceptTransferSchema = z.object({
  accountId: z.string().uuid(),
  markTrusted: z.boolean().optional(),
});
