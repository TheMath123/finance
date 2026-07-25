import { redirect } from '@sveltejs/kit';

import * as adminApi from '$lib/server/admin-api';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');

	const result = await adminApi.getPlatformMetrics(locals.session.accessToken);
	return { metrics: result.ok ? result.value : null };
};
