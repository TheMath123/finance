import { fail, redirect } from '@sveltejs/kit';

import { parseReaisToCents } from '$lib/money';
import * as adminApi from '$lib/server/admin-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) redirect(303, '/login');

	const [plansResult, flagsResult] = await Promise.all([
		adminApi.listPlans(locals.session.accessToken),
		adminApi.listFeatureFlags(locals.session.accessToken)
	]);
	// API já devolve do created_at mais recente pro mais antigo (ver
	// plan.repository.ts) — só separa em duas abas aqui, sem reordenar.
	const allPlans = plansResult.ok ? plansResult.value : [];
	const showInactive = url.searchParams.get('status') === 'inactive';
	return {
		plans: allPlans.filter((plan) => plan.isActive !== showInactive),
		showInactive,
		featureFlags: flagsResult.ok ? flagsResult.value : []
	};
};

// Marcas diacríticas combinantes (U+0300–U+036F) que sobram após normalize('NFD')
// separar uma letra acentuada em base + acento — construído via \u pra não depender
// de como o editor/terminal exibe o caractere combinante em si.
const DIACRITICS_PATTERN = /[̀-ͯ]/g;

/** Chave estável derivada do nome — nunca digitada à mão; unicidade é checada pelo backend (plan_key_taken). */
function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(DIACRITICS_PATTERN, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);
}

function parsePlanFields(form: FormData): Omit<adminApi.PlanInput, 'key'> {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		description: form.get('description')?.toString().trim() || null,
		trialDays: Number(form.get('trialDays') ?? 0),
		limits: {
			maxOwnedSharedWorkspaces: Number(form.get('maxOwnedSharedWorkspaces') ?? 0),
			maxMembersPerWorkspace: Number(form.get('maxMembersPerWorkspace') ?? 1),
			maxSavedFormulasPerWorkspace: Number(form.get('maxSavedFormulasPerWorkspace') ?? 0)
		},
		features: form.getAll('features').map((f) => f.toString()),
		// UI mostra "Público" (marcado = aparece no catálogo) — invertido aqui
		// pro campo real do backend, que é isPrivate.
		isPrivate: form.get('isPublic') !== 'on'
	};
}

function parsePlanPriceFields(form: FormData): adminApi.PlanPriceInput {
	return {
		billingIntervalUnit: form
			.get('billingIntervalUnit')
			?.toString() as adminApi.PlanPriceInput['billingIntervalUnit'],
		billingIntervalCount: Number(form.get('billingIntervalCount') ?? 1),
		priceCents: parseReaisToCents(form.get('priceCents')?.toString() ?? '') ?? 0,
		maxInstallments: Number(form.get('maxInstallments') ?? 1),
		paymentMethods: form
			.getAll('paymentMethods')
			.map((m) => m.toString()) as adminApi.PaymentMethod[],
		isDefault: form.get('isDefault') === 'on',
		sortOrder: Number(form.get('sortOrder') ?? 0)
	};
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const fields = parsePlanFields(form);
		const input = { key: slugify(fields.name), ...fields };

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
	},

	addPrice: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const planId = form.get('planId')?.toString() ?? '';
		const input = parsePlanPriceFields(form);

		const result = await adminApi.addPlanPrice(locals.session.accessToken, planId, input);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	updatePrice: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const planId = form.get('planId')?.toString() ?? '';
		const priceId = form.get('priceId')?.toString() ?? '';
		const input = parsePlanPriceFields(form);

		const result = await adminApi.updatePlanPrice(
			locals.session.accessToken,
			planId,
			priceId,
			input
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	deletePrice: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const planId = form.get('planId')?.toString() ?? '';
		const priceId = form.get('priceId')?.toString() ?? '';

		const result = await adminApi.deletePlanPrice(locals.session.accessToken, planId, priceId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
