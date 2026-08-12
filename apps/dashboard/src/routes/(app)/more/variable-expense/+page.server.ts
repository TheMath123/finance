import { redirect } from '@sveltejs/kit';

import * as summaryApi from '$lib/server/summary-api';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const result = await summaryApi.getVariableExpenseEstimate(
		locals.session.accessToken,
		activeWorkspace.id
	);
	return {
		estimate: result.ok ? result.value : { byCategory: [], total: 0 }
	};
};
