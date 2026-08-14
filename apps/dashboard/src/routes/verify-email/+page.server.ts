import { verifyEmailSchema } from '$lib/schemas/auth';
import * as authApi from '$lib/server/auth-api';

import type { PageServerLoad } from './$types';

/**
 * Fluxo por link (não por código): o e-mail de confirmação traz um botão que
 * cai aqui com `?token=...` — o próprio `load` já confirma no backend, sem
 * precisar de ação/clique adicional na página.
 */
export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	const parsed = verifyEmailSchema.safeParse({ token });
	if (!parsed.success) {
		return { success: false as const, message: 'Link de confirmação inválido.' };
	}

	const result = await authApi.verifyEmail(parsed.data);
	if (!result.ok) {
		return {
			success: false as const,
			message:
				result.error.code === 'invalid_token'
					? 'Este link expirou ou já foi usado. Peça um novo e-mail de confirmação.'
					: result.error.message
		};
	}

	return { success: true as const };
};
