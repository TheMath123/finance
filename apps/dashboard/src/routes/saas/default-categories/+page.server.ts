import { fail, redirect } from '@sveltejs/kit';

import * as adminApi from '$lib/server/admin-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');

	const result = await adminApi.listDefaultCategories(locals.session.accessToken);
	return { categories: result.ok ? result.value : [] };
};

function parseForm(form: FormData): adminApi.DefaultCategoryInput {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		icon: form.get('icon')?.toString().trim() ?? '',
		color: form.get('color')?.toString().trim() ?? '',
		isFallback: form.get('isFallback')?.toString() === 'true'
	};
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const input = parseForm(form);

		const result = await adminApi.createDefaultCategory(locals.session.accessToken, input);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const categoryId = form.get('categoryId')?.toString() ?? '';
		const input = parseForm(form);

		const result = await adminApi.updateDefaultCategory(
			locals.session.accessToken,
			categoryId,
			input
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	remove: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const categoryId = form.get('categoryId')?.toString() ?? '';

		const result = await adminApi.deleteDefaultCategory(locals.session.accessToken, categoryId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
