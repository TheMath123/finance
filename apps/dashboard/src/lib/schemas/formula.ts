import { SAVED_FORMULA_DISPLAY_FORMATS, SAVED_FORMULA_PINNED_TO } from '@finance/shared';
import { z } from 'zod';

/**
 * Espelha a validação do backend (http/modules/saved-formula/schemas.ts) —
 * a regra de verdade (token conhecido, avaliação segura) continua na API.
 */
export const savedFormulaSchema = z.object({
	name: z.string().min(1, 'Informe um nome').max(80),
	expression: z.string().min(1, 'Escreva uma fórmula'),
	displayFormat: z.enum(SAVED_FORMULA_DISPLAY_FORMATS),
	pinnedTo: z.enum(SAVED_FORMULA_PINNED_TO)
});
