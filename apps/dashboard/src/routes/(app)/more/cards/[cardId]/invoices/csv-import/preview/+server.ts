import { redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as invoiceApi from '$lib/server/invoice-api';

import type { RequestHandler } from './$types';

/**
 * Proxy do preview de import de CSV — o client fala com essa rota (não com o
 * backend direto), mesma regra de sempre; devolve o envelope de erro padrão
 * em JSON (não a página de erro do SvelteKit) porque quem chama é fetch()
 * do client-side, não uma navegação.
 */
export const POST: RequestHandler = async ({ request, cookies, locals, params }) => {
	if (!locals.session) redirect(303, '/login');
	const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

	const formData = await request.formData();
	const file = formData.get('file');
	const month = Number(formData.get('month'));
	const year = Number(formData.get('year'));
	if (!(file instanceof File) || !Number.isInteger(month) || !Number.isInteger(year)) {
		return Response.json(
			{ error: { code: 'validation_error', message: 'Dados inválidos.' } },
			{ status: 400 }
		);
	}

	const result = await invoiceApi.previewInvoiceCsvImport(
		locals.session.accessToken,
		workspaceId,
		params.cardId,
		{ month, year, file }
	);
	if (!result.ok) {
		return Response.json({ error: result.error }, { status: result.error.status || 500 });
	}
	return Response.json(result.value);
};
