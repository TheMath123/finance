import { error, fail, redirect } from '@sveltejs/kit';

import * as accountApi from '$lib/server/account-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as cardApi from '$lib/server/card-api';
import * as invoiceApi from '$lib/server/invoice-api';

import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ parent, locals, params, url }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const accessToken = locals.session.accessToken;
	const workspaceId = activeWorkspace.id;

	// Filtro por competência (<input type="month">, formato YYYY-MM) — pula
	// direto pra fatura daquele mês, sem precisar paginar até achar.
	const monthParam = url.searchParams.get('month');
	const [yearFilter, monthFilter] = monthParam?.match(/^\d{4}-\d{2}$/)
		? [Number(monthParam.slice(0, 4)), Number(monthParam.slice(5, 7))]
		: [undefined, undefined];
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const offset = (page - 1) * PAGE_SIZE;

	const [cards, invoices, accounts] = await Promise.all([
		cardApi.listCards(accessToken, workspaceId),
		invoiceApi.listInvoices(accessToken, workspaceId, params.cardId, {
			limit: PAGE_SIZE,
			offset,
			month: monthFilter,
			year: yearFilter
		}),
		accountApi.listAccounts(accessToken, workspaceId)
	]);

	const card = cards.ok ? cards.value.find((c) => c.id === params.cardId) : undefined;
	if (!card) error(404, 'Cartão não encontrado.');

	return {
		card,
		invoices: invoices.ok ? invoices.value.invoices : [],
		total: invoices.ok ? invoices.value.total : 0,
		current: invoices.ok ? invoices.value.current : null,
		page,
		pageSize: PAGE_SIZE,
		monthFilter: monthParam ?? '',
		accounts: accounts.ok ? accounts.value.filter((a) => !a.archivedAt) : []
	};
};

export const actions: Actions = {
	pay: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const invoiceId = form.get('invoiceId')?.toString() ?? '';
		const accountId = form.get('accountId')?.toString() ?? '';
		const date = form.get('date')?.toString() ?? '';
		const method = form.get('method')?.toString() === 'debit' ? 'debit' : 'pix';
		const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

		if (!accountId || !date) {
			return fail(400, { message: 'Escolha a conta e a data do pagamento.' });
		}

		const result = await invoiceApi.payInvoice(locals.session.accessToken, workspaceId, invoiceId, {
			accountId,
			date,
			method
		});
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
