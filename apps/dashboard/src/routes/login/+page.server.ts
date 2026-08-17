import { fail, redirect } from '@sveltejs/kit';

import { loginSchema } from '$lib/schemas/auth';
import { safeRedirectTarget } from '$lib/safe-redirect';
import * as authApi from '$lib/server/auth-api';
import { setSessionCookies } from '$lib/server/session';

import type { Actions, PageServerLoad } from './$types';

/**
 * `?redirectTo=` — link direto de e-mail (convite de workspace, ver
 * my-invites/+page.server.ts) que exige login antes de continuar. Preservado
 * através do form (campo hidden) e repassado pro link "Criar conta" (ver
 * +page.svelte) pra sobreviver a quem ainda não tem conta.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.session) redirect(303, safeRedirectTarget(url.searchParams.get('redirectTo')));
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const raw = {
			email: form.get('email')?.toString() ?? '',
			password: form.get('password')?.toString() ?? ''
		};
		const redirectTo = safeRedirectTarget(form.get('redirectTo')?.toString());

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
		redirect(303, redirectTo);
	}
};
