import { fail, redirect } from '@sveltejs/kit';

import { forgotPasswordSchema, verifyResetCodeSchema } from '$lib/schemas/auth';
import * as authApi from '$lib/server/auth-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.session) redirect(303, '/');
	return { email: url.searchParams.get('email') ?? '' };
};

export const actions: Actions = {
	/** Nomeada (não `default`) — SvelteKit não permite misturar `default` com actions nomeadas (`resend`) no mesmo arquivo. */
	verify: async ({ request }) => {
		const form = await request.formData();
		const raw = {
			email: form.get('email')?.toString() ?? '',
			code: form.get('code')?.toString() ?? ''
		};

		const parsed = verifyResetCodeSchema.safeParse(raw);
		if (!parsed.success) {
			const errors = Object.fromEntries(
				parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])
			);
			return fail(400, { email: raw.email, code: raw.code, errors });
		}

		const result = await authApi.verifyResetCode(parsed.data);
		if (!result.ok) {
			return fail(result.error.status || 400, {
				email: raw.email,
				code: raw.code,
				message: result.error.message
			});
		}

		redirect(
			303,
			`/new-password?email=${encodeURIComponent(parsed.data.email)}&code=${encodeURIComponent(parsed.data.code)}`
		);
	},

	/** Chamado via `fetch` direto pelo botão "Reenviar código" — não navega a página. */
	resend: async ({ request }) => {
		const form = await request.formData();
		const raw = { email: form.get('email')?.toString() ?? '' };

		const parsed = forgotPasswordSchema.safeParse(raw);
		if (!parsed.success) return fail(400, { message: 'Informe um e-mail válido.' });

		await authApi.forgotPassword(parsed.data);
		return { resent: true };
	}
};
