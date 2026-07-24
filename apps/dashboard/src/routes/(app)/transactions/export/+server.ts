import { error, redirect } from '@sveltejs/kit';

import { apiRequestRaw } from '$lib/server/api-client';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';

import type { RequestHandler } from './$types';

/**
 * Proxy do export CSV (M2-11) — o client nunca fala com o backend
 * diretamente, então isto reencaminha a resposta (incluindo o header de
 * download) através do próprio domínio do dashboard.
 */
export const GET: RequestHandler = async ({ cookies, locals }) => {
	if (!locals.session) redirect(303, '/login');
	const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

	const response = await apiRequestRaw(`/workspaces/${workspaceId}/export.csv`, {
		accessToken: locals.session.accessToken
	});

	if (!response.ok) error(response.status, 'Não foi possível gerar o export.');

	return new Response(response.body, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="transacoes.csv"'
		}
	});
};
