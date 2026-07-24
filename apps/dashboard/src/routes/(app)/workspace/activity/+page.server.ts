import { redirect } from '@sveltejs/kit';

import * as workspaceApi from '$lib/server/workspace-api';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const result = await workspaceApi.listActivity(locals.session.accessToken, activeWorkspace.id, {
		limit: 50
	});

	return { activity: result.ok ? result.value : [] };
};
