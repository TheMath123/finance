import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { acceptTransferSchema, transferFormSchema } from '$lib/schemas/transfer';
import * as accountApi from '$lib/server/account-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as transferApi from '$lib/server/transfer-api';

import type { Actions, PageServerLoad } from './$types';

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

export const load: PageServerLoad = async ({ parent, locals, cookies }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');
	const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

	const [accounts, pending, transferAccounts, trustedContacts] = await Promise.all([
		accountApi.listAccounts(locals.session.accessToken, workspaceId),
		transferApi.listPendingTransfers(locals.session.accessToken),
		transferApi.listTransferAccounts(locals.session.accessToken),
		transferApi.listTrustedContacts(locals.session.accessToken)
	]);
	return {
		accounts: accounts.ok ? accounts.value : [],
		pending: pending.ok ? pending.value : [],
		transferAccounts: transferAccounts.ok ? transferAccounts.value : [],
		trustedContacts: trustedContacts.ok ? trustedContacts.value : []
	};
};

export const actions: Actions = {
	create: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const raw = {
			recipient: form.get('recipient')?.toString().trim() ?? '',
			amount: Number(form.get('amount')?.toString().replace(',', '.')) * 100,
			description: form.get('description')?.toString().trim() ?? '',
			accountId: form.get('accountId')?.toString() ?? ''
		};
		const parsed = transferFormSchema.safeParse({ ...raw, amount: Math.round(raw.amount) });
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await transferApi.createTransfer(
			locals.session.accessToken,
			workspaceId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	accept: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const transferId = form.get('transferId')?.toString() ?? '';

		const parsed = acceptTransferSchema.safeParse({
			accountId: form.get('accountId')?.toString() ?? '',
			markTrusted: form.get('markTrusted') === 'true'
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await transferApi.acceptTransfer(
			locals.session.accessToken,
			transferId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	reject: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const transferId = form.get('transferId')?.toString() ?? '';

		const result = await transferApi.rejectTransfer(locals.session.accessToken, transferId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	removeTrustedContact: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const id = form.get('id')?.toString() ?? '';

		const result = await transferApi.removeTrustedContact(locals.session.accessToken, id);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
