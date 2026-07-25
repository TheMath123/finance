import { error, json } from '@sveltejs/kit';

import * as notificationApi from '$lib/server/notification-api';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) error(401, 'Não autenticado.');

	const result = await notificationApi.archiveNotification(
		locals.session.accessToken,
		params.notificationId
	);
	if (!result.ok) error(result.error.status, result.error.message);
	return json({ ok: true });
};
