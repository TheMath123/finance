import { redirect } from '@sveltejs/kit';

import * as notificationApi from '$lib/server/notification-api';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');

	const accessToken = locals.session.accessToken;

	const [active, archived, preferences] = await Promise.all([
		notificationApi.listNotifications(accessToken, false),
		notificationApi.listNotifications(accessToken, true),
		notificationApi.listNotificationPreferences(accessToken)
	]);

	return {
		active: active.ok ? active.value : [],
		archived: archived.ok ? archived.value : [],
		preferences: preferences.ok ? preferences.value : []
	};
};
