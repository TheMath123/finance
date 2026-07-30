import { fail, redirect } from '@sveltejs/kit';

import { parseReaisToCents } from '$lib/money';
import * as adminApi from '$lib/server/admin-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');

	const result = await adminApi.listPlans(locals.session.accessToken);
	return { plans: result.ok ? result.value : [] };
};

function parseFeatures(raw: string): string[] {
	return raw
		.split(',')
		.map((f) => f.trim())
		.filter((f) => f.length > 0);
}

function parsePlanFields(form: FormData): Omit<adminApi.PlanInput, 'key'> {
	const priceCents = parseReaisToCents(form.get('price')?.toString() ?? '') ?? 0;
	return {
		name: form.get('name')?.toString().trim() ?? '',
		description: form.get('description')?.toString().trim() || null,
		priceCents,
		billingIntervalUnit:
			(form.get('billingIntervalUnit')?.toString() as adminApi.PlanInput['billingIntervalUnit']) ??
			'month',
		billingIntervalCount: Number(form.get('billingIntervalCount') ?? 1),
		limits: {
			maxOwnedSharedWorkspaces: Number(form.get('maxOwnedSharedWorkspaces') ?? 0),
			maxMembersPerWorkspace: Number(form.get('maxMembersPerWorkspace') ?? 1),
			maxSavedFormulasPerWorkspace: Number(form.get('maxSavedFormulasPerWorkspace') ?? 0)
		},
		features: parseFeatures(form.get('features')?.toString() ?? '')
	};
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const input = {
			key: form.get('key')?.toString().trim() ?? '',
			...parsePlanFields(form)
		};

		const result = await adminApi.createPlan(locals.session.accessToken, input);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const id = form.get('id')?.toString() ?? '';
		const patch = parsePlanFields(form);

		const result = await adminApi.updatePlan(locals.session.accessToken, id, patch);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	deactivate: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const id = form.get('id')?.toString() ?? '';

		const result = await adminApi.deactivatePlan(locals.session.accessToken, id);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	activate: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const id = form.get('id')?.toString() ?? '';

		const result = await adminApi.activatePlan(locals.session.accessToken, id);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
