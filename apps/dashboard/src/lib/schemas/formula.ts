import { SAVED_FORMULA_DISPLAY_FORMATS } from '@finance/shared';
import { z } from 'zod';

/**
 * Espelha a validação do backend (http/modules/saved-formula/schemas.ts) —
 * a regra de verdade (token conhecido, avaliação segura) continua na API.
 */
export const savedFormulaSchema = z.object({
	name: z.string().min(1, 'Informe um nome').max(80),
	expression: z.string().min(1, 'Escreva uma fórmula'),
	displayFormat: z.enum(SAVED_FORMULA_DISPLAY_FORMATS),
	pinnedHome: z.enum(['true', 'false']).transform((v) => v === 'true'),
	pinnedTransactions: z.enum(['true', 'false']).transform((v) => v === 'true')
});

/** Toggle rápido de fixação (pin ao lado da fórmula salva) — não mexe em nome/expressão/formato. */
export const pinFormulaSchema = z.object({
	pinnedHome: z.enum(['true', 'false']).transform((v) => v === 'true'),
	pinnedTransactions: z.enum(['true', 'false']).transform((v) => v === 'true')
});

/** Reorder dos widgets fixados (drag-and-drop) — `formulaIds` chega como JSON stringificado no FormData. */
export const reorderFormulasSchema = z.object({
	field: z.enum(['home', 'transactions']),
	formulaIds: z
		.string()
		.transform((v, ctx) => {
			try {
				return JSON.parse(v) as unknown;
			} catch {
				ctx.addIssue({ code: 'custom', message: 'Lista de fórmulas inválida.' });
				return z.NEVER;
			}
		})
		.pipe(z.array(z.string().uuid()).min(1))
});
