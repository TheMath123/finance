import { redirect } from '@sveltejs/kit';

import { getAttachmentUrl } from '$lib/server/attachment-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';

import type { RequestHandler } from './$types';

/** Proxy autenticado pra URL assinada do comprovante — o client nunca fala com o backend direto. */
export const GET: RequestHandler = async ({ params, cookies, locals }) => {
	if (!locals.session) redirect(303, '/login');
	const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

	const result = await getAttachmentUrl(
		locals.session.accessToken,
		workspaceId,
		params.transactionId
	);
	if (!result.ok) {
		return Response.json({ error: result.error }, { status: result.error.status || 500 });
	}
	return Response.json(result.value);
};
