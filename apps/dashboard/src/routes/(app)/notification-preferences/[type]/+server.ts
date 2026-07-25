import type { NotificationType } from '@finance/shared';
import { error, json } from '@sveltejs/kit';

import * as notificationApi from '$lib/server/notification-api';

import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) error(401, 'Não autenticado.');

	const { enabled } = (await request.json()) as { enabled: boolean };
	const result = await notificationApi.updateNotificationPreference(
		locals.session.accessToken,
		params.type as NotificationType,
		enabled
	);
	if (!result.ok) error(result.error.status, result.error.message);
	return json({ ok: true });
};
