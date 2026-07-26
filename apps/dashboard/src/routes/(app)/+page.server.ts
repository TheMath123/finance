import { type Cookies, fail } from '@sveltejs/kit';

import { savedFormulaSchema } from '$lib/schemas/formula';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as formulaApi from '$lib/server/formula-api';
import * as summaryApi from '$lib/server/summary-api';

import type { Actions, PageServerLoad } from './$types';

function currentYearMonth(): { year: number; month: number } {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { activeWorkspace } = await parent();

	const fallback = currentYearMonth();
	const year = Number(url.searchParams.get('year')) || fallback.year;
	const month = Number(url.searchParams.get('month')) || fallback.month;

	if (!activeWorkspace || !locals.session) {
		return { summary: null, year, month, formulas: [] };
	}

	const accessToken = locals.session.accessToken;
	// Catálogo de variáveis da calculadora (valores + rótulos) é derivado do
	// próprio `summary` no client (lib/formula-catalog.ts) — sem chamada extra.
	const [summary, formulas] = await Promise.all([
		summaryApi.getMonthlySummary(accessToken, activeWorkspace.id, year, month),
		formulaApi.listFormulas(accessToken, activeWorkspace.id)
	]);

	return {
		summary: summary.ok ? summary.value : null,
		year,
		month,
		formulas: formulas.ok ? formulas.value : []
	};
};

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

export const actions: Actions = {
	createFormula: async ({ request, cookies, locals }) => {
		if (!locals.session) return fail(401, { message: 'Sessão expirada.' });
		const form = await request.formData();
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = savedFormulaSchema.safeParse({
			name: form.get('name')?.toString() ?? '',
			expression: form.get('expression')?.toString() ?? '',
			displayFormat: form.get('displayFormat')?.toString(),
			pinnedTo: form.get('pinnedTo')?.toString()
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await formulaApi.createFormula(
			locals.session.accessToken,
			workspaceId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	updateFormula: async ({ request, cookies, locals }) => {
		if (!locals.session) return fail(401, { message: 'Sessão expirada.' });
		const form = await request.formData();
		const formulaId = form.get('formulaId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = savedFormulaSchema.safeParse({
			name: form.get('name')?.toString() ?? '',
			expression: form.get('expression')?.toString() ?? '',
			displayFormat: form.get('displayFormat')?.toString(),
			pinnedTo: form.get('pinnedTo')?.toString()
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await formulaApi.updateFormula(
			locals.session.accessToken,
			workspaceId,
			formulaId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	deleteFormula: async ({ request, cookies, locals }) => {
		if (!locals.session) return fail(401, { message: 'Sessão expirada.' });
		const form = await request.formData();
		const formulaId = form.get('formulaId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await formulaApi.deleteFormula(
			locals.session.accessToken,
			workspaceId,
			formulaId
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
