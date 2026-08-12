import { error, fail, redirect } from '@sveltejs/kit';

import * as accountApi from '$lib/server/account-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as cardApi from '$lib/server/card-api';
import * as categoryApi from '$lib/server/category-api';
import * as invoiceApi from '$lib/server/invoice-api';

import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ parent, locals, params, url }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const accessToken = locals.session.accessToken;
	const workspaceId = activeWorkspace.id;

	// Filtro por competência — dois selects (mês/ano) em vez de um <input type="month">.
	const monthParam = Number(url.searchParams.get('month'));
	const yearParam = Number(url.searchParams.get('year'));
	const monthFilter =
		Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12 ? monthParam : undefined;
	const yearFilter = Number.isInteger(yearParam) && yearParam >= 2000 ? yearParam : undefined;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const offset = (page - 1) * PAGE_SIZE;

	const [cards, invoices, accounts, categories, allInvoices] = await Promise.all([
		cardApi.listCards(accessToken, workspaceId),
		invoiceApi.listInvoices(accessToken, workspaceId, params.cardId, {
			limit: PAGE_SIZE,
			offset,
			month: monthFilter,
			year: yearFilter
		}),
		accountApi.listAccounts(accessToken, workspaceId),
		categoryApi.listCategories(accessToken, workspaceId),
		// Busca leve, sem paginação/filtro — só pra saber quais meses/anos têm
		// fatura de verdade e popular os selects do filtro (nunca deixa o
		// usuário escolher uma combinação vazia).
		invoiceApi.listInvoices(accessToken, workspaceId, params.cardId, { limit: 500 })
	]);

	const card = cards.ok ? cards.value.find((c) => c.id === params.cardId) : undefined;
	if (!card) error(404, 'Cartão não encontrado.');

	const availablePeriods = allInvoices.ok
		? [
				...new Map(
					allInvoices.value.invoices.map((i) => [
						`${i.yearReference}-${i.monthReference}`,
						{ month: i.monthReference, year: i.yearReference }
					])
				).values()
			].sort((a, b) => b.year - a.year || b.month - a.month)
		: [];

	return {
		card,
		invoices: invoices.ok ? invoices.value.invoices : [],
		total: invoices.ok ? invoices.value.total : 0,
		current: invoices.ok ? invoices.value.current : null,
		page,
		pageSize: PAGE_SIZE,
		monthFilter,
		yearFilter,
		availablePeriods,
		accounts: accounts.ok ? accounts.value.filter((a) => !a.archivedAt) : [],
		categories: categories.ok ? categories.value : [],
		csvImportEnabled: locals.session.featureFlags.card_invoice_csv_import === true
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
	},

	undoPayment: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const invoiceId = form.get('invoiceId')?.toString() ?? '';
		const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

		const result = await invoiceApi.undoInvoicePayment(
			locals.session.accessToken,
			workspaceId,
			invoiceId
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
