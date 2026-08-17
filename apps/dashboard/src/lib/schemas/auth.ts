import { passwordValidator } from '@finance/shared';
import { z } from 'zod';

/**
 * Espelham a validação do backend (http/modules/auth/schemas.ts) pro form dar
 * feedback antes do submit — a regra de verdade continua na borda da API.
 * Mesmo `passwordValidator` de @finance/shared usado lá: `weak` pra senha já
 * existente (login, reconfirmação), `strong` pra senha nova (cadastro,
 * reset, troca).
 */
const newPasswordSchema = passwordValidator({ force: 'strong' }).max(128);
const existingPasswordSchema = passwordValidator({ force: 'weak' });

export const loginSchema = z.object({
	email: z.email('Informe um e-mail válido').toLowerCase(),
	password: existingPasswordSchema
});

export const registerSchema = z
	.object({
		name: z.string().min(1, 'Informe seu nome').max(120),
		email: z.email('Informe um e-mail válido').toLowerCase(),
		password: newPasswordSchema,
		confirmPassword: z.string(),
		termsAccepted: z.literal(true, { error: 'É preciso aceitar os termos de uso' })
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'As senhas não coincidem',
		path: ['confirmPassword']
	});

export const forgotPasswordSchema = z.object({
	email: z.email('Informe um e-mail válido').toLowerCase()
});

export const resetCodeSchema = z
	.string()
	.length(6, 'Código deve ter 6 dígitos')
	.regex(/^\d{6}$/, 'Código deve conter apenas números');

export const verifyResetCodeSchema = z.object({
	email: z.email('Informe um e-mail válido').toLowerCase(),
	code: resetCodeSchema
});

export const verifyEmailSchema = z.object({
	token: z.string().min(1, 'Token inválido')
});

export const setNewPasswordSchema = z
	.object({
		password: newPasswordSchema,
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'As senhas não coincidem',
		path: ['confirmPassword']
	});
