import { fail, redirect } from '@sveltejs/kit';

import { setNewPasswordSchema } from '$lib/schemas/auth';
import * as authApi from '$lib/server/auth-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.session) redirect(303, '/');

	const email = url.searchParams.get('email');
	const code = url.searchParams.get('code');
	// Chegou direto (sem passar pelo passo do código) — manda de volta pro início do fluxo.
	if (!email || !code) redirect(303, '/reset-password');

	return { email, code };
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const email = url.searchParams.get('email') ?? '';
		const code = url.searchParams.get('code') ?? '';
		const raw = {
			password: form.get('password')?.toString() ?? '',
			confirmPassword: form.get('confirmPassword')?.toString() ?? ''
		};

		const parsed = setNewPasswordSchema.safeParse(raw);
		if (!parsed.success) {
			const errors = Object.fromEntries(
				parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])
			);
			return fail(400, { errors });
		}

		if (!email || !code) {
			return fail(400, { message: 'Sessão de redefinição expirada. Comece de novo.' });
		}

		// O código é reenviado aqui pra revalidar (não expirou, ainda é válido) antes de trocar a senha.
		const result = await authApi.resetPassword({ email, code, password: parsed.data.password });
		if (!result.ok) {
			return fail(result.error.status || 400, { message: result.error.message });
		}

		redirect(303, '/login');
	}
};
