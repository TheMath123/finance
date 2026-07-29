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

		// Resposta do backend é sempre genérica (OWASP: não revela se o e-mail
		// existe) — seguimos pro próximo passo do fluxo do mesmo jeito, exista
		// ou não a conta.
		await authApi.forgotPassword(parsed.data);
		redirect(303, `/reset-password?email=${encodeURIComponent(parsed.data.email)}`);
	}
};
