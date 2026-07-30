import { fail, redirect } from '@sveltejs/kit';

import * as adminApi from '$lib/server/admin-api';

import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) redirect(303, '/login');

	const search = url.searchParams.get('q') ?? undefined;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));

	const [workspacesResult, plansResult] = await Promise.all([
		adminApi.listWorkspaces(locals.session.accessToken, {
			search,
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE
		}),
		adminApi.listPlans(locals.session.accessToken)
	]);

	return {
		workspaces: workspacesResult.ok ? workspacesResult.value.workspaces : [],
		total: workspacesResult.ok ? workspacesResult.value.total : 0,
		plans: plansResult.ok ? plansResult.value.filter((p) => p.isActive) : [],
		page,
		pageSize: PAGE_SIZE,
		search: search ?? ''
	};
};

export const actions: Actions = {
	setPlan: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const workspaceId = form.get('workspaceId')?.toString() ?? '';
		const planId = form.get('planId')?.toString() ?? '';

		const result = await adminApi.setWorkspacePlan(locals.session.accessToken, workspaceId, planId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
