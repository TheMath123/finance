import { TRANSACTION_METHODS, TRANSACTION_TYPES } from '@finance/shared';
import { z } from 'zod';

/**
 * Espelham a validação do backend (http/modules/transaction/schemas.ts +
 * as regras por método em application/use-cases/transaction/create-transaction.ts)
 * pro form dar feedback antes do submit — a regra de verdade continua na API.
 */
const dateFormat = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');

export const transactionFormSchema = z
	.object({
		description: z.string().min(1, 'Informe uma descrição').max(200),
		amount: z.number().int().positive('Informe um valor maior que zero'),
		type: z.enum(TRANSACTION_TYPES),
		method: z.enum(TRANSACTION_METHODS),
		date: dateFormat,
		categoryId: z.string().min(1, 'Escolha uma categoria'),
		accountId: z.string().optional(),
		toAccountId: z.string().optional(),
		cardId: z.string().optional(),
		installments: z.number().int().min(1).max(48).optional()
	})
	.refine(
		(data) => {
			if (data.method === 'transfer') {
				return Boolean(data.accountId && data.toAccountId && data.accountId !== data.toAccountId);
			}
			if (data.method === 'credit') return Boolean(data.cardId);
			return Boolean(data.accountId);
		},
		{
			message: 'Escolha conta/cartão de acordo com o método',
			path: ['accountId']
		}
	);

export const transactionEditSchema = z.object({
	description: z.string().min(1, 'Informe uma descrição').max(200),
	amount: z.number().int().positive('Informe um valor maior que zero'),
	categoryId: z.string().min(1, 'Escolha uma categoria'),
	date: dateFormat,
	accountId: z.string().optional(),
	cardId: z.string().optional()
});

export const installmentTotalSchema = z.object({
	newTotalAmount: z.number().int().positive('Informe um valor maior que zero')
});
