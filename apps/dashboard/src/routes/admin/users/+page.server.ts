import { fail, redirect } from '@sveltejs/kit';

import * as adminApi from '$lib/server/admin-api';

import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) redirect(303, '/login');

	const search = url.searchParams.get('q') ?? undefined;
	const page = Number(url.searchParams.get('page') ?? '1');
	const offset = Math.max(0, (page - 1) * PAGE_SIZE);

	const result = await adminApi.listUsers(locals.session.accessToken, {
		search,
		limit: PAGE_SIZE,
		offset
	});

	return {
		users: result.ok ? result.value.users : [],
		total: result.ok ? result.value.total : 0,
		search: search ?? '',
		page,
		pageSize: PAGE_SIZE
	};
};

export const actions: Actions = {
	suspend: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const userId = form.get('userId')?.toString() ?? '';

		const result = await adminApi.suspendUser(locals.session.accessToken, userId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	reactivate: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const userId = form.get('userId')?.toString() ?? '';

		const result = await adminApi.reactivateUser(locals.session.accessToken, userId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
