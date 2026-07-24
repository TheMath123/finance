import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { parseReaisToCents } from '$lib/money';
import { cardFormSchema } from '$lib/schemas/finance';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as cardApi from '$lib/server/card-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const result = await cardApi.listCards(locals.session.accessToken, activeWorkspace.id);
	return { cards: result.ok ? result.value : [] };
};

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

function parseCardForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		bankCode: form.get('bankCode')?.toString() ?? '',
		limit: parseReaisToCents(form.get('limit')?.toString() ?? '') ?? NaN,
		closingDay: Number(form.get('closingDay')?.toString() ?? ''),
		dueDay: Number(form.get('dueDay')?.toString() ?? '')
	};
}

export const actions: Actions = {
	create: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const raw = parseCardForm(await request.formData());
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = cardFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { name: raw.name, message: parsed.error.issues[0]?.message });
		}

		const result = await cardApi.createCard(locals.session.accessToken, workspaceId, parsed.data);
		if (!result.ok) {
			return fail(result.error.status || 500, { name: raw.name, message: result.error.message });
		}
		return { success: true };
	},

	update: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const cardId = form.get('cardId')?.toString() ?? '';
		const raw = parseCardForm(form);
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = cardFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message });
		}

		const result = await cardApi.updateCard(
			locals.session.accessToken,
			workspaceId,
			cardId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		redirect(303, '/cards');
	},

	archive: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const cardId = form.get('cardId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await cardApi.archiveCard(locals.session.accessToken, workspaceId, cardId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	remove: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const cardId = form.get('cardId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await cardApi.deleteCard(locals.session.accessToken, workspaceId, cardId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
