import { redirect } from '@sveltejs/kit';

import * as accountApi from '$lib/server/account-api';
import * as cardApi from '$lib/server/card-api';
import * as categoryApi from '$lib/server/category-api';

import type { PageServerLoad } from './$types';

/**
 * Página própria (não mais um dialog) — o dialog tinha uma tabela com
 * scroll interno dentro do próprio scroll do dialog, e o popup do
 * ComboSelect (categoria por linha) as vezes abria fora de posição nesse
 * aninhamento em telas pequenas. Uma rota cheia dá o espaço vertical real
 * da viewport pra tabela de revisão, sem scroll aninhado.
 */
export const load: PageServerLoad = async ({ parent, locals }) => {
	const { activeWorkspace } = await parent();
	if (!activeWorkspace || !locals.session) redirect(303, '/');
	if (activeWorkspace.role === 'viewer') redirect(303, '/transactions');

	const accessToken = locals.session.accessToken;
	const workspaceId = activeWorkspace.id;

	const cardCsvImportEnabled = locals.session.featureFlags.card_invoice_csv_import === true;
	const accountCsvImportEnabled = locals.session.featureFlags.account_csv_import === true;
	if (!cardCsvImportEnabled && !accountCsvImportEnabled) redirect(303, '/transactions');

	const [cards, accounts, categories] = await Promise.all([
		cardApi.listCards(accessToken, workspaceId),
		accountApi.listAccounts(accessToken, workspaceId),
		categoryApi.listCategories(accessToken, workspaceId)
	]);

	return {
		cards: cards.ok ? cards.value : [],
		accounts: accounts.ok ? accounts.value : [],
		categories: categories.ok ? categories.value : [],
		cardCsvImportEnabled,
		accountCsvImportEnabled
	};
};
