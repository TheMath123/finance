import { fail, redirect } from '@sveltejs/kit';

import * as workspaceApi from '$lib/server/workspace-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');

	const result = await workspaceApi.listMyInvites(locals.session.accessToken);
	return { myInvites: result.ok ? result.value : [] };
};

export const actions: Actions = {
	accept: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const inviteId = form.get('inviteId')?.toString() ?? '';

		const result = await workspaceApi.acceptInvite(locals.session.accessToken, inviteId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
