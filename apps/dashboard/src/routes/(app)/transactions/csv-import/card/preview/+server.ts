import { redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as invoiceApi from '$lib/server/invoice-api';

import type { RequestHandler } from './$types';

/**
 * Proxy do preview de import de CSV de fatura a partir da tela de Transações
 * — mesma rota do backend que a página de faturas usa, mas o `cardId` vem do
 * formData (aqui não tem cardId fixo no path da URL).
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	if (!locals.session) redirect(303, '/login');
	const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

	const formData = await request.formData();
	const file = formData.get('file');
	const cardId = formData.get('cardId');
	const month = Number(formData.get('month'));
	const year = Number(formData.get('year'));
	if (
		!(file instanceof File) ||
		typeof cardId !== 'string' ||
		!cardId ||
		!Number.isInteger(month) ||
		!Number.isInteger(year)
	) {
		return Response.json(
			{ error: { code: 'validation_error', message: 'Dados inválidos.' } },
			{ status: 400 }
		);
	}

	const result = await invoiceApi.previewInvoiceCsvImport(
		locals.session.accessToken,
		workspaceId,
		cardId,
		{ month, year, file }
	);
	if (!result.ok) {
		return Response.json({ error: result.error }, { status: result.error.status || 500 });
	}
	return Response.json(result.value);
};
