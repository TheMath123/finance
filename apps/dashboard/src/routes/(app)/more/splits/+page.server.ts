import { fail, redirect } from '@sveltejs/kit';

import * as splitApi from '$lib/server/split-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const [owedByMe, owedToMe] = await Promise.all([
		splitApi.listOwedByMe(locals.session.accessToken),
		splitApi.listOwedToMe(locals.session.accessToken)
	]);
	return {
		owedByMe: owedByMe.ok ? owedByMe.value : [],
		owedToMe: owedToMe.ok ? owedToMe.value : []
	};
};

export const actions: Actions = {
	markPaid: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const shareId = form.get('shareId')?.toString() ?? '';

		const result = await splitApi.markSharePaid(locals.session.accessToken, shareId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	confirm: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const shareId = form.get('shareId')?.toString() ?? '';

		const result = await splitApi.confirmShare(locals.session.accessToken, shareId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
