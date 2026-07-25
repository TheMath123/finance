import { error, json } from '@sveltejs/kit';

import * as notificationApi from '$lib/server/notification-api';

import type { RequestHandler } from './$types';

/**
 * Proxy da mutação — o sino/lista de notificações chamam isto via `fetch`
 * simples (mesma origem, sessão pelo cookie) em vez de form action, porque
 * a lista precisa se sentir uma inbox reativa, não uma página que recarrega.
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) error(401, 'Não autenticado.');

	const result = await notificationApi.markNotificationRead(
		locals.session.accessToken,
		params.notificationId
	);
	if (!result.ok) error(result.error.status, result.error.message);
	return json({ ok: true });
};
