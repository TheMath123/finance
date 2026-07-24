import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as workspaceApi from '$lib/server/workspace-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const result = await workspaceApi.listMembers(locals.session.accessToken, activeWorkspace.id);

	return { members: result.ok ? result.value : [] };
};

/** Resolve o workspace ativo dentro de uma action (actions não recebem `parent`). */
function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

export const actions: Actions = {
	updateRole: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const userId = form.get('userId')?.toString() ?? '';
		const role = form.get('role')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await workspaceApi.updateMemberRole(
			locals.session.accessToken,
			workspaceId,
			userId,
			role
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	remove: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const userId = form.get('userId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await workspaceApi.removeMember(locals.session.accessToken, workspaceId, userId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
