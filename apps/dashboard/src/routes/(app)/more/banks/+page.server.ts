import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as bankApi from '$lib/server/bank-api';
import { bankFormSchema } from '$lib/schemas/finance';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const result = await bankApi.listBanks(locals.session.accessToken, activeWorkspace.id);
	return { banks: result.ok ? result.value : [] };
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
			bankCode: form.get('bankCode')?.toString() ?? ''
		};
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = bankFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { ...raw, message: parsed.error.issues[0]?.message });
		}

		const result = await bankApi.createBank(locals.session.accessToken, workspaceId, parsed.data);
		if (!result.ok)
			return fail(result.error.status || 500, { ...raw, message: result.error.message });
		return { success: true };
	},

	update: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const bankId = form.get('bankId')?.toString() ?? '';
		const raw = {
			name: form.get('name')?.toString().trim() ?? '',
			bankCode: form.get('bankCode')?.toString() ?? ''
		};
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = bankFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message });
		}

		const result = await bankApi.updateBank(
			locals.session.accessToken,
			workspaceId,
			bankId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	archive: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const bankId = form.get('bankId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await bankApi.archiveBank(locals.session.accessToken, workspaceId, bankId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	remove: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const bankId = form.get('bankId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await bankApi.deleteBank(locals.session.accessToken, workspaceId, bankId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
