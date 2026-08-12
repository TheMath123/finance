import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { parseReaisToCents } from '$lib/money';
import { pinFormulaSchema, reorderFormulasSchema, savedFormulaSchema } from '$lib/schemas/formula';
import { convertToRecurringSchema } from '$lib/schemas/recurring';
import {
	installmentTotalSchema,
	transactionEditSchema,
	transactionFormSchema
} from '$lib/schemas/transaction';
import * as accountApi from '$lib/server/account-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as cardApi from '$lib/server/card-api';
import * as categoryApi from '$lib/server/category-api';
import * as formulaApi from '$lib/server/formula-api';
import * as summaryApi from '$lib/server/summary-api';
import * as transactionApi from '$lib/server/transaction-api';

import type { Actions, PageServerLoad } from './$types';

/** A calculadora usa sempre o mês corrente aqui — a página tem filtro de data livre, não navegação por mês como a Home. */
function currentYearMonth(): { year: number; month: number } {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Primeiro/último dia do mês atual (YYYY-MM-DD) — default da listagem quando o usuário não escolheu um período. */
function currentMonthRange(): { from: string; to: string } {
	const [year, month] = new Date().toISOString().slice(0, 10).split('-').map(Number);
	const from = `${year}-${String(month).padStart(2, '0')}-01`;
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
	return { from, to };
}

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const accessToken = locals.session.accessToken;
	const workspaceId = activeWorkspace.id;

	// Sem "from"/"to" na URL (primeira visita) cai no mês atual — evita
	// carregar o histórico inteiro de transações de cara. Um valor presente
	// mas vazio (usuário limpou o campo e clicou em Filtrar) já significa
	// "sem limite" e não deve reativar o default.
	const defaultRange = currentMonthRange();
	const filters = {
		q: url.searchParams.get('q') ?? undefined,
		from: url.searchParams.get('from') ?? defaultRange.from,
		to: url.searchParams.get('to') ?? defaultRange.to,
		categoryId: url.searchParams.get('categoryId') ?? undefined,
		accountId: url.searchParams.get('accountId') ?? undefined,
		cardId: url.searchParams.get('cardId') ?? undefined,
		deletedOnly: url.searchParams.get('deletedOnly') === 'true'
	};

	const { year, month } = currentYearMonth();
	const [transactions, categories, accounts, cards, formulas, formulaSummary] = await Promise.all([
		transactionApi.listTransactions(accessToken, workspaceId, filters),
		categoryApi.listCategories(accessToken, workspaceId),
		accountApi.listAccounts(accessToken, workspaceId),
		cardApi.listCards(accessToken, workspaceId),
		formulaApi.listFormulas(accessToken, workspaceId),
		summaryApi.getMonthlySummary(accessToken, workspaceId, year, month)
	]);

	return {
		transactions: transactions.ok ? transactions.value : [],
		categories: categories.ok ? categories.value : [],
		accounts: accounts.ok ? accounts.value : [],
		cards: cards.ok ? cards.value : [],
		cardCsvImportEnabled: locals.session.featureFlags.card_invoice_csv_import === true,
		accountCsvImportEnabled: locals.session.featureFlags.account_csv_import === true,
		filters,
		formulas: formulas.ok ? formulas.value : [],
		formulaSummary: formulaSummary.ok
			? formulaSummary.value
			: {
					year,
					month,
					income: 0,
					expense: 0,
					byCategory: [],
					byMethod: [],
					totalBalance: 0,
					projectedAvailable: null
				}
	};
};

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

function numberField(form: FormData, key: string): number | undefined {
	const raw = form.get(key)?.toString();
	if (!raw) return undefined;
	const value = Number(raw);
	return Number.isFinite(value) ? value : undefined;
}

/** `undefined` quando o campo nem veio no form (ex.: input disabled de parcela travada) — distinto de "veio mas não deu pra parsear" (`NaN`, ainda inválido onde for obrigatório). */
function centsField(form: FormData, key: string): number | undefined {
	const raw = form.get(key);
	if (raw === null) return undefined;
	return parseReaisToCents(raw.toString()) ?? Number.NaN;
}

function textField(form: FormData, key: string): string | undefined {
	const raw = form.get(key)?.toString().trim();
	return raw ? raw : undefined;
}

export const actions: Actions = {
	create: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const raw = {
			description: textField(form, 'description') ?? '',
			amount: centsField(form, 'amount'),
			type: form.get('type')?.toString() ?? 'expense',
			method: form.get('method')?.toString() ?? 'pix',
			date: textField(form, 'date') ?? '',
			categoryId: textField(form, 'categoryId') ?? '',
			accountId: textField(form, 'accountId'),
			toAccountId: textField(form, 'toAccountId'),
			cardId: textField(form, 'cardId'),
			installments: numberField(form, 'installments')
		};

		const parsed = transactionFormSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await transactionApi.createTransaction(
			locals.session.accessToken,
			workspaceId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	update: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const transactionId = form.get('transactionId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const raw = {
			description: textField(form, 'description') ?? '',
			// amount/date ausentes = parcela travada (input disabled, sem name) — o form
			// não tenta mais mandar o valor atual pra "preencher" o schema; ausente aqui
			// significa ausente pro backend também, que é o que libera a edição só de
			// descrição/categoria (ver update-transaction.ts: trava se input.amount/date
			// estiverem *presentes*, não se mudaram de valor).
			amount: centsField(form, 'amount'),
			categoryId: textField(form, 'categoryId') ?? '',
			date: textField(form, 'date'),
			accountId: textField(form, 'accountId'),
			cardId: textField(form, 'cardId')
		};

		const parsed = transactionEditSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await transactionApi.updateTransaction(
			locals.session.accessToken,
			workspaceId,
			transactionId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	/** Valor TOTAL de uma compra parcelada — redivide só entre as parcelas ainda não pagas. */
	updateInstallmentTotal: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const transactionId = form.get('transactionId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = installmentTotalSchema.safeParse({
			newTotalAmount: centsField(form, 'newTotalAmount')
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await transactionApi.updateInstallmentTotal(
			locals.session.accessToken,
			workspaceId,
			transactionId,
			parsed.data.newTotalAmount
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	/** Converte a transação avulsa em recorrência — vira a primeira ocorrência, sem recriar o lançamento. */
	convertToRecurring: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const transactionId = form.get('transactionId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = convertToRecurringSchema.safeParse({
			frequency: form.get('frequency')?.toString(),
			dayOfReference: numberField(form, 'dayOfReference'),
			monthOfReference: numberField(form, 'monthOfReference')
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await transactionApi.convertToRecurring(
			locals.session.accessToken,
			workspaceId,
			transactionId,
			parsed.data
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	remove: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const transactionId = form.get('transactionId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await transactionApi.deleteTransaction(
			locals.session.accessToken,
			workspaceId,
			transactionId
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	restore: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const transactionId = form.get('transactionId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const result = await transactionApi.restoreTransaction(
			locals.session.accessToken,
			workspaceId,
			transactionId
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	},

	createFormula: async ({ request, cookies, locals }) => {
		if (!locals.session) return fail(401, { message: 'Sessão expirada.' });
		const form = await request.formData();
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = savedFormulaSchema.safeParse({
			name: form.get('name')?.toString() ?? '',
			expression: form.get('expression')?.toString() ?? '',
			displayFormat: form.get('displayFormat')?.toString(),
			pinnedHome: form.get('pinnedHome')?.toString(),
			pinnedTransactions: form.get('pinnedTransactions')?.toString()
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await formulaApi.createFormula(
			locals.session.accessToken,
			workspaceId,
			parsed.data
		);
		if (!result.ok) {
			return fail(result.error.status || 500, {
				message: result.error.message,
				code: result.error.code
			});
		}
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
			pinnedHome: form.get('pinnedHome')?.toString(),
			pinnedTransactions: form.get('pinnedTransactions')?.toString()
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
	},

	/** Toggle rápido de fixação pelo pin ao lado da fórmula salva — não passa por nome/expressão/formato. */
	pinFormula: async ({ request, cookies, locals }) => {
		if (!locals.session) return fail(401, { message: 'Sessão expirada.' });
		const form = await request.formData();
		const formulaId = form.get('formulaId')?.toString() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = pinFormulaSchema.safeParse({
			pinnedHome: form.get('pinnedHome')?.toString(),
			pinnedTransactions: form.get('pinnedTransactions')?.toString()
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

	/** Reorder dos widgets fixados via drag-and-drop (svelte-dnd-action). */
	reorderFormulas: async ({ request, cookies, locals }) => {
		if (!locals.session) return fail(401, { message: 'Sessão expirada.' });
		const form = await request.formData();
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		const parsed = reorderFormulasSchema.safeParse({
			field: form.get('field')?.toString(),
			formulaIds: form.get('formulaIds')?.toString() ?? '[]'
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
		}

		const result = await formulaApi.reorderFormulas(
			locals.session.accessToken,
			workspaceId,
			parsed.data.field,
			parsed.data.formulaIds
		);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
