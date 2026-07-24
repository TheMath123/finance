import { ACCOUNT_TYPES, BANK_CODES } from '@finance/shared';
import { z } from 'zod';

/**
 * Espelham a validação do backend (http/modules/{bank,account,card}/schemas.ts)
 * pro form dar feedback antes do submit — a regra de verdade continua na API.
 */
export const bankFormSchema = z.object({
	name: z.string().min(1, 'Informe um nome').max(80),
	bankCode: z.string().refine((c) => BANK_CODES.includes(c), 'Escolha um banco do catálogo')
});

export const accountFormSchema = z.object({
	name: z.string().min(1, 'Informe um nome').max(80),
	bankCode: z.string().refine((c) => BANK_CODES.includes(c), 'Escolha um banco do catálogo'),
	type: z.enum(ACCOUNT_TYPES),
	initialBalance: z.number().int('Valor inválido')
});

export const cardFormSchema = z.object({
	name: z.string().min(1, 'Informe um nome').max(80),
	bankCode: z.string().refine((c) => BANK_CODES.includes(c), 'Escolha um banco do catálogo'),
	limit: z.number().int().positive('Informe um limite maior que zero'),
	closingDay: z.number().int().min(1).max(28, 'Dia entre 1 e 28'),
	dueDay: z.number().int().min(1).max(28, 'Dia entre 1 e 28')
});
