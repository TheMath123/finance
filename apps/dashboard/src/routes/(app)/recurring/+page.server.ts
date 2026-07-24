import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { recurringFormSchema } from '$lib/schemas/recurring';
import * as accountApi from '$lib/server/account-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as cardApi from '$lib/server/card-api';
import * as categoryApi from '$lib/server/category-api';
import { parseReaisToCents } from '$lib/money';
import * as recurringApi from '$lib/server/recurring-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const accessToken = locals.session.accessToken;
	const workspaceId = activeWorkspace.id;

	const [recurring, categories, accounts, cards] = await Promise.all([
		recurringApi.listRecurring(accessToken, workspaceId),
		categoryApi.listCategories(accessToken, workspaceId),
		accountApi.listAccounts(accessToken, workspaceId),
		cardApi.listCards(accessToken, workspaceId)
	]);

	return {
		recurring: recurring.ok ? recurring.value : [],
		categories: categories.ok ? categories.value : [],
		accounts: accounts.ok ? accounts.value : [],
		cards: cards.ok ? cards.value : []
	};
};

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

function numberField(form: FormData, key: string): number | undefined {
	const raw = form.get(key)?.toString();
	if (!raw) return undefined;
	const value = Number(raw);
	return Number.isFinite(value) ? value : undefined;
}

function textField(form: FormData, key: string): string | undefined {
	const raw = form.get(key)?.toString().trim();
	return raw ? raw : undefined;
}

function parseRecurringForm(form: FormData) {
	return {
		description: textField(form, 'description') ?? '',
		amount: parseReaisToCents(form.get('amount')?.toString() ?? '') ?? Number.NaN,
		type: form.get('type')?.toString() ?? 'expense',
		method: form.get('method')?.toString() ?? 'pix',
		categoryId: textField(form, 'categoryId') ?? '',
		accountId: textField(form, 'accountId'),
		cardId: textField(form, 'cardId'),
		frequency: form.get('frequency')?.toString() ?? 'monthly',
		dayOfReference: numberField(form, 'dayOfReference') ?? Number.NaN,
		monthOfReference: numberField(form, 'monthOfReference')
	};
}

export const actions: Actions = {
	create: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const raw = parseRecurringForm(form);
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = recurringFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await recurringApi.createRecurring(
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
		const recurringId = form.get('recurringId')?.toString() ?? '';
		const raw = parseRecurringForm(form);
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = recurringFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await recurringApi.updateRecurring(
			locals.session.accessToken,
			workspaceId,
			recurringId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	toggleActive: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const recurringId = form.get('recurringId')?.toString() ?? '';
		const active = form.get('active')?.toString() === 'true';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await recurringApi.updateRecurring(
			locals.session.accessToken,
			workspaceId,
			recurringId,
			{ active }
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	remove: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const recurringId = form.get('recurringId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await recurringApi.deleteRecurring(
			locals.session.accessToken,
			workspaceId,
			recurringId
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
