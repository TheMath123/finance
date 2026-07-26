import { fail, redirect } from '@sveltejs/kit';

import * as adminApi from '$lib/server/admin-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');

	const result = await adminApi.getAiSettings(locals.session.accessToken);
	return { settings: result.ok ? result.value : null };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const raw = form.get('dailyTokenBudgetPerUser')?.toString() ?? '';
		const value = Number(raw);
		if (!Number.isFinite(value) || value <= 0) {
			return fail(400, { message: 'Informe um número inteiro positivo.' });
		}

		const result = await adminApi.updateAiSettings(locals.session.accessToken, value);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
