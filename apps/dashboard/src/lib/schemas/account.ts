import { z } from 'zod';

/**
 * Espelham a validação do backend (http/modules/auth/schemas.ts) pro form
 * dar feedback antes do submit — a regra de verdade continua na API.
 */
const resetCodeSchema = z
	.string()
	.length(6, 'Código deve ter 6 dígitos')
	.regex(/^\d{6}$/, 'Código deve conter apenas números');

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, 'Informe a senha atual'),
	newPassword: z.string().min(8, 'A nova senha precisa de pelo menos 8 caracteres').max(128)
});

export const requestEmailChangeSchema = z.object({
	newEmail: z.email('Informe um e-mail válido').toLowerCase(),
	currentPassword: z.string().min(1, 'Informe a senha atual')
});

export const confirmCodeSchema = z.object({
	code: resetCodeSchema
});

export const requestAccountDeletionSchema = z.object({
	password: z.string().min(1, 'Informe a senha atual')
});
