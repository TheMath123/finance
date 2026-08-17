import { passwordValidator } from '@finance/shared';
import { z } from 'zod';

/**
 * Espelham a validação do backend (http/modules/auth/schemas.ts) pro form
 * dar feedback antes do submit — a regra de verdade continua na API. Mesmo
 * `passwordValidator` de @finance/shared: `weak` pra senha atual (só
 * reconfirmação, já existe), `strong` pra senha nova.
 */
const resetCodeSchema = z
	.string()
	.length(6, 'Código deve ter 6 dígitos')
	.regex(/^\d{6}$/, 'Código deve conter apenas números');

const newPasswordSchema = passwordValidator({ force: 'strong' }).max(128);
const existingPasswordSchema = passwordValidator({ force: 'weak' });

export const changePasswordSchema = z
	.object({
		currentPassword: existingPasswordSchema,
		newPassword: newPasswordSchema,
		confirmNewPassword: z.string()
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: 'As senhas não coincidem',
		path: ['confirmNewPassword']
	});

export const requestEmailChangeSchema = z.object({
	newEmail: z.email('Informe um e-mail válido').toLowerCase(),
	currentPassword: existingPasswordSchema
});

export const confirmCodeSchema = z.object({
	code: resetCodeSchema
});

export const requestAccountDeletionSchema = z.object({
	password: existingPasswordSchema
});
