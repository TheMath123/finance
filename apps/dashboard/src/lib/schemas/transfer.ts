import { emailOrPhoneSchema } from '@finance/shared';
import { z } from 'zod';

/** Espelha a validação do backend (http/modules/transfer/schemas.ts). */
export const transferFormSchema = z.object({
	/** Telefone ou e-mail de um usuário existente na plataforma. */
	recipient: emailOrPhoneSchema,
	amount: z.number().int().positive('Informe um valor maior que zero'),
	description: z.string().min(1, 'Informe uma descrição').max(200),
	accountId: z.string().uuid('Selecione a conta de origem')
});

export const acceptTransferSchema = z.object({
	accountId: z.string().uuid('Selecione a conta de destino'),
	markTrusted: z.boolean().optional()
});
