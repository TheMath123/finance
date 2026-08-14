import { fail, redirect } from '@sveltejs/kit';

import { parseReaisToCents } from '$lib/money';
import * as adminApi from '$lib/server/admin-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');

	const [plansResult, flagsResult] = await Promise.all([
		adminApi.listPlans(locals.session.accessToken),
		adminApi.listFeatureFlags(locals.session.accessToken)
	]);
	return {
		plans: plansResult.ok ? plansResult.value : [],
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
		features: form.getAll('features').map((f) => f.toString())
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
		const forWorkspaceId = form.get('forWorkspaceId')?.toString().trim();

		if (forWorkspaceId) {
			const { name, description, trialDays, limits, features } = parsePlanFields(form);
			const result = await adminApi.createPrivatePlanForWorkspace(
				locals.session.accessToken,
				forWorkspaceId,
				{ name, description, trialDays, limits, features, price: parsePlanPriceFields(form) }
			);
			if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
			return { success: true };
		}

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
		// makePublic só existe no form quando o plano editado já era privado —
		// desmarcado por padrão, então só mexe no vínculo quando o admin pede
		// explicitamente. restrictedToWorkspaceId (texto) só existe quando o
		// plano era público e o admin marcou "tornar privado" + colou o id do
		// workspace de destino — o backend valida existência e que o plano não
		// esteja compartilhado por mais de um workspace.
		if (form.get('makePublic') === 'on') {
			patch.restrictedToWorkspaceId = null;
		} else {
			const workspaceId = form.get('restrictedToWorkspaceId')?.toString().trim();
			if (workspaceId) patch.restrictedToWorkspaceId = workspaceId;
		}

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
