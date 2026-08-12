import { redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as invoiceApi from '$lib/server/invoice-api';

import type { RequestHandler } from './$types';

/** Proxy da confirmação de import de CSV — mesma regra do preview (ver ao lado). */
export const POST: RequestHandler = async ({ request, cookies, locals, params }) => {
	if (!locals.session) redirect(303, '/login');
	const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

	const body = await request.json();
	const result = await invoiceApi.confirmInvoiceCsvImport(
		locals.session.accessToken,
		workspaceId,
		params.cardId,
		body
	);
	if (!result.ok) {
		return Response.json({ error: result.error }, { status: result.error.status || 500 });
	}
	return Response.json(result.value);
};
