import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as workspaceApi from '$lib/server/workspace-api';

import type { Actions, PageServerLoad } from './$types';

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

export const load: PageServerLoad = async ({ parent, locals, cookies }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);
	const [billingResult, plansResult] = await Promise.all([
		workspaceApi.getBillingStatus(locals.session.accessToken, workspaceId),
		workspaceApi.listAvailablePlans(locals.session.accessToken)
	]);

	return {
		billing: billingResult.ok ? billingResult.value : null,
		plans: plansResult.ok ? plansResult.value.filter((p) => p.isActive) : []
	};
};

export const actions: Actions = {
	checkout: async ({ request, cookies, locals, url }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const planId = form.get('planId')?.toString() ?? '';
		const planPriceId = form.get('planPriceId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await workspaceApi.startCheckout(locals.session.accessToken, workspaceId, {
			planId,
			planPriceId,
			successUrl: `${url.origin}/workspace/plan?checkout=success`,
			cancelUrl: `${url.origin}/workspace/plan?checkout=cancel`
		});
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		// Primeiro redirect da dashboard pra uma URL externa (Stripe Checkout hospedado).
		redirect(303, result.value.checkoutUrl);
	},

	portal: async ({ cookies, locals, url }) => {
		if (!locals.session) redirect(303, '/login');
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await workspaceApi.startBillingPortal(
			locals.session.accessToken,
			workspaceId,
			`${url.origin}/workspace/plan`
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		redirect(303, result.value.portalUrl);
	}
};
