import { fail, redirect } from '@sveltejs/kit';

import * as adminApi from '$lib/server/admin-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) redirect(303, '/login');

	const search = url.searchParams.get('q') ?? undefined;
	const result = await adminApi.listFeatureFlags(locals.session.accessToken, search);
	return { flags: result.ok ? result.value : [], search: search ?? '' };
};

export const actions: Actions = {
	toggle: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const key = form.get('key')?.toString() ?? '';
		const enabled = form.get('enabled')?.toString() === 'true';

		const result = await adminApi.updateFeatureFlag(locals.session.accessToken, key, {
			enabled
		});
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
