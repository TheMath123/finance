import { fail, redirect } from '@sveltejs/kit';

import { forgotPasswordSchema } from '$lib/schemas/auth';
import * as authApi from '$lib/server/auth-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.session) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const raw = { email: form.get('email')?.toString() ?? '' };

		const parsed = forgotPasswordSchema.safeParse(raw);
		if (!parsed.success) {
			const errors = Object.fromEntries(
				parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])
			);
			return fail(400, { email: raw.email, errors });
		}

		// O use-case sempre responde sucesso genérico (OWASP: não revela se o
		// e-mail existe, nem se o cooldown de 10min por e-mail bloqueou o envio)
		// — só um erro de verdade chega aqui como `!result.ok` (ex.: 429 de
		// limite por IP, que é seguro de revelar por não depender do e-mail alvo).
		const result = await authApi.forgotPassword(parsed.data);
		if (!result.ok) {
			return fail(result.error.status || 500, {
				email: raw.email,
				message: result.error.message
			});
		}
		redirect(303, `/reset-password?email=${encodeURIComponent(parsed.data.email)}`);
	}
};
