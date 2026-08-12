import { z } from 'zod';

/** Espelha a validação do backend (http/modules/split/schemas.ts). */
const participantSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('user'),
		/** Telefone ou e-mail de um usuário existente na plataforma. */
		contact: z.string().min(3).max(320),
		amount: z.number().int().positive().optional()
	}),
	z.object({
		type: z.literal('external'),
		name: z.string().min(1).max(120),
		amount: z.number().int().positive().optional()
	})
]);

/** `participantsJson` chega como JSON stringificado no FormData — linhas dinâmicas no client. */
export const createSplitSchema = z.object({
	participantsJson: z
		.string()
		.transform((v, ctx) => {
			try {
				return JSON.parse(v) as unknown;
			} catch {
				ctx.addIssue({ code: 'custom', message: 'Participantes inválidos.' });
				return z.NEVER;
			}
		})
		.pipe(z.array(participantSchema).min(1).max(20))
});
