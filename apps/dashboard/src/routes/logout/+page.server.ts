import { redirect } from '@sveltejs/kit';

import * as authApi from '$lib/server/auth-api';
import { clearSessionCookies, getRefreshToken } from '$lib/server/session';

import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const refreshToken = getRefreshToken(cookies);
		// Revoga o refresh token no backend; falha de rede não impede o logout local
		if (refreshToken) await authApi.logout(refreshToken);
		clearSessionCookies(cookies);
		redirect(303, '/login');
	}
};
