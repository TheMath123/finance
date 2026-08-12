import { redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as invoiceApi from '$lib/server/invoice-api';

import type { RequestHandler } from './$types';

/** Proxy da confirmação de import de CSV de fatura a partir da tela de Transações — ver preview ao lado. */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	if (!locals.session) redirect(303, '/login');
	const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

	const body = await request.json();
	const { cardId, ...input } = body ?? {};
	if (typeof cardId !== 'string' || !cardId) {
		return Response.json(
			{ error: { code: 'validation_error', message: 'Cartão não informado.' } },
			{ status: 400 }
		);
	}

	const result = await invoiceApi.confirmInvoiceCsvImport(
		locals.session.accessToken,
		workspaceId,
		cardId,
		input
	);
	if (!result.ok) {
		return Response.json({ error: result.error }, { status: result.error.status || 500 });
	}
	return Response.json(result.value);
};
