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
