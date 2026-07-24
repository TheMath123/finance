import type { Cookies } from '@sveltejs/kit';

import { dev } from '$app/environment';

// Mesmo padrão dos cookies de sessão (_ta/_rr): nome curto, httpOnly.
const WORKSPACE_COOKIE = '_ws';
const ONE_YEAR_S = 365 * 24 * 60 * 60;

export function getActiveWorkspaceId(cookies: Cookies): string | undefined {
	return cookies.get(WORKSPACE_COOKIE);
}

export function setActiveWorkspaceId(cookies: Cookies, workspaceId: string) {
	cookies.set(WORKSPACE_COOKIE, workspaceId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: ONE_YEAR_S
	});
}
