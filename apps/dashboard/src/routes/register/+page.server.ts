import { fail, redirect } from '@sveltejs/kit';

import { registerSchema } from '$lib/schemas/auth';
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
			name: form.get('name')?.toString() ?? '',
			email: form.get('email')?.toString() ?? '',
			password: form.get('password')?.toString() ?? '',
			termsAccepted: form.get('terms') === 'on'
		};
		const values = { name: raw.name, email: raw.email };

		const parsed = registerSchema.safeParse(raw);
		if (!parsed.success) {
			const errors = Object.fromEntries(
				parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])
			);
			return fail(400, { ...values, errors });
		}

		const result = await authApi.register(parsed.data);
		if (!result.ok) {
			const message =
				result.error.code === 'email_taken'
					? 'Já existe uma conta com esse e-mail.'
					: result.error.message;
			return fail(result.error.status || 503, { ...values, message });
		}

		setSessionCookies(cookies, result.value);
		redirect(303, '/');
	}
};
