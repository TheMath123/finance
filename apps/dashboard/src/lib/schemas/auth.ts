import { z } from 'zod';

/**
 * Espelham a validação do backend (http/modules/auth/schemas.ts) pro form dar
 * feedback antes do submit — a regra de verdade continua na borda da API.
 */
export const loginSchema = z.object({
	email: z.email('Informe um e-mail válido').toLowerCase(),
	password: z.string().min(1, 'Informe a senha')
});

export const registerSchema = z.object({
	name: z.string().min(1, 'Informe seu nome').max(120),
	email: z.email('Informe um e-mail válido').toLowerCase(),
	password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').max(128),
	termsAccepted: z.literal(true, { error: 'É preciso aceitar os termos de uso' })
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

export const newPasswordSchema = z
	.object({
		password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').max(128),
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'As senhas não coincidem',
		path: ['confirmPassword']
	});
