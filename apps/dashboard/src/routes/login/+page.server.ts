import { fail, redirect } from '@sveltejs/kit';

import { loginSchema } from '$lib/schemas/auth';
import * as authApi from '$lib/server/auth-api';
import { setSessionCookies } from '$lib/server/session';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.session) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const raw = {
			email: form.get('email')?.toString() ?? '',
			password: form.get('password')?.toString() ?? ''
		};

		const parsed = loginSchema.safeParse(raw);
		if (!parsed.success) {
			const errors = Object.fromEntries(
				parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])
			);
			return fail(400, { email: raw.email, errors });
		}

		const result = await authApi.login(parsed.data);
		if (!result.ok) {
			const message =
				result.error.code === 'invalid_credentials'
					? 'E-mail ou senha inválidos.'
					: result.error.message;
			return fail(result.error.status || 503, { email: raw.email, message });
		}

		setSessionCookies(cookies, result.value);
		redirect(303, '/');
	}
};
