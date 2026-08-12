import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { categoryFormSchema } from '$lib/schemas/finance';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as categoryApi from '$lib/server/category-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace, categoriesManagementEnabled } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');
	if (!categoriesManagementEnabled) redirect(303, '/more/accounts');

	const result = await categoryApi.listCategories(locals.session.accessToken, activeWorkspace.id);
	return { categories: result.ok ? result.value : [] };
};

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

export const actions: Actions = {
	create: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const raw = {
			name: form.get('name')?.toString().trim() ?? '',
			icon: form.get('icon')?.toString().trim() ?? '',
			color: form.get('color')?.toString().trim() ?? ''
		};
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = categoryFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await categoryApi.createCategory(
			locals.session.accessToken,
			workspaceId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	update: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const categoryId = form.get('categoryId')?.toString() ?? '';
		const raw = {
			name: form.get('name')?.toString().trim() ?? '',
			icon: form.get('icon')?.toString().trim() ?? '',
			color: form.get('color')?.toString().trim() ?? ''
		};
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = categoryFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await categoryApi.updateCategory(
			locals.session.accessToken,
			workspaceId,
			categoryId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	remove: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const categoryId = form.get('categoryId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await categoryApi.deleteCategory(
			locals.session.accessToken,
			workspaceId,
			categoryId
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
