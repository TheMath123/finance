import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { parseReaisToCents } from '$lib/money';
import { accountFormSchema } from '$lib/schemas/finance';
import * as accountApi from '$lib/server/account-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const result = await accountApi.listAccounts(locals.session.accessToken, activeWorkspace.id);
	return { accounts: result.ok ? result.value : [] };
};

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

function parseAccountForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		bankCode: form.get('bankCode')?.toString() ?? '',
		type: form.get('type')?.toString() ?? 'checking',
		initialBalance: parseReaisToCents(form.get('initialBalance')?.toString() ?? '0') ?? NaN
	};
}

export const actions: Actions = {
	create: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const raw = parseAccountForm(await request.formData());
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = accountFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { name: raw.name, message: parsed.error.issues[0]?.message });
		}

		const result = await accountApi.createAccount(
			locals.session.accessToken,
			workspaceId,
			parsed.data
		);
		if (!result.ok) {
			return fail(result.error.status || 500, { name: raw.name, message: result.error.message });
		}
		return { success: true };
	},

	update: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const accountId = form.get('accountId')?.toString() ?? '';
		const raw = parseAccountForm(form);
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = accountFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message });
		}

		const result = await accountApi.updateAccount(
			locals.session.accessToken,
			workspaceId,
			accountId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	archive: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const accountId = form.get('accountId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await accountApi.archiveAccount(
			locals.session.accessToken,
			workspaceId,
			accountId
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	remove: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const accountId = form.get('accountId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await accountApi.deleteAccount(
			locals.session.accessToken,
			workspaceId,
			accountId
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
