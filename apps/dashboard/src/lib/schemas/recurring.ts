import { RECURRENCE_FREQUENCIES } from '@finance/shared';
import { z } from 'zod';

/**
 * Espelham a validação do backend (http/modules/recurring/schemas.ts) pro
 * form dar feedback antes do submit — a regra de verdade continua na API.
 * Transferência recorrente fica fora do M1 (sem conta destino).
 */
const recurringMethods = ['pix', 'debit', 'cash', 'credit'] as const;

export const recurringFormSchema = z
	.object({
		description: z.string().min(1, 'Informe uma descrição').max(200),
		amount: z.number().int().positive('Informe um valor maior que zero'),
		type: z.enum(['income', 'expense']),
		method: z.enum(recurringMethods),
		categoryId: z.string().min(1, 'Escolha uma categoria'),
		accountId: z.string().optional(),
		cardId: z.string().optional(),
		frequency: z.enum(RECURRENCE_FREQUENCIES),
		dayOfReference: z.number().int().min(0).max(31),
		monthOfReference: z.number().int().min(1).max(12).optional(),
		active: z.boolean().optional()
	})
	.refine((data) => (data.method === 'credit' ? Boolean(data.cardId) : Boolean(data.accountId)), {
		message: 'Escolha conta/cartão de acordo com o método',
		path: ['accountId']
	})
	.refine(
		(data) => {
			if (data.frequency === 'weekly') return data.dayOfReference >= 0 && data.dayOfReference <= 6;
			return data.dayOfReference >= 1 && data.dayOfReference <= 31;
		},
		{ message: 'Dia inválido pra frequência escolhida', path: ['dayOfReference'] }
	)
	.refine((data) => data.frequency !== 'yearly' || Boolean(data.monthOfReference), {
		message: 'Escolha o mês pra frequência anual',
		path: ['monthOfReference']
	});
