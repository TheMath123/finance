import { error, redirect } from '@sveltejs/kit';

import { apiRequestStream } from '$lib/server/api-client';

import type { RequestHandler } from './$types';

/**
 * Proxy do SSE de notificações — o browser não consegue mandar header
 * `Authorization` custom num `EventSource` nativo, então isto reencaminha o
 * stream (com o Bearer token anexado aqui, server-side) através do próprio
 * domínio do dashboard. O `signal` do request original é repassado pro fetch
 * upstream, então desconectar o EventSource no browser encerra a assinatura
 * no backend imediatamente (mesmo padrão de cleanup usado lá).
 */
export const GET: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) redirect(303, '/login');

	const response = await apiRequestStream('/notifications/stream', {
		accessToken: locals.session.accessToken,
		signal: request.signal
	});

	if (!response.ok || !response.body) {
		error(response.status || 502, 'Não foi possível conectar ao stream de notificações.');
	}

	return new Response(response.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
