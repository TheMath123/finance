import { error, redirect } from '@sveltejs/kit';

import * as cardApi from '$lib/server/card-api';
import * as categoryApi from '$lib/server/category-api';

import type { PageServerLoad } from './$types';

/**
 * Página própria (não mais um dialog) — mesmo motivo do /transactions/import:
 * a tabela de revisão com scroll interno dentro do scroll do dialog fazia o
 * popup do ComboSelect (categoria por linha) abrir fora de posição em telas
 * pequenas. Rota cheia dá o espaço vertical real da viewport.
 */
export const load: PageServerLoad = async ({ parent, locals, params, url }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');

	const csvImportEnabled = locals.session.featureFlags.card_invoice_csv_import === true;
	if (!csvImportEnabled) redirect(303, `/more/cards/${params.cardId}/invoices`);

	const accessToken = locals.session.accessToken;
	const workspaceId = activeWorkspace.id;

	const [cards, categories] = await Promise.all([
		cardApi.listCards(accessToken, workspaceId),
		categoryApi.listCategories(accessToken, workspaceId)
	]);

	const card = cards.ok ? cards.value.find((c) => c.id === params.cardId) : undefined;
	if (!card) error(404, 'Cartão não encontrado.');

	// Mês/ano vêm da tela de faturas (link já carrega a competência que fazia
	// sentido lá — fatura em aberto ou o filtro ativo); sem eles, cai no mês
	// corrente.
	const monthParam = Number(url.searchParams.get('month'));
	const yearParam = Number(url.searchParams.get('year'));
	const now = new Date();
	const defaultMonth =
		Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
			? monthParam
			: now.getMonth() + 1;
	const defaultYear =
		Number.isInteger(yearParam) && yearParam >= 2000 ? yearParam : now.getFullYear();

	return {
		card,
		categories: categories.ok ? categories.value : [],
		defaultMonth,
		defaultYear
	};
};
