import type { Cookies } from '@sveltejs/kit';

import { dev } from '$app/environment';

import * as authApi from './auth-api';
import type { AuthSession, SessionUser } from './auth-api';

// Nomes curtos e não-descritivos de propósito — não anunciam o que carregam.
const ACCESS_COOKIE = '_ta';
const REFRESH_COOKIE = '_rr';

/** Mesmo TTL do refresh token no backend (30 dias — infra/security/jose-token-service). */
const REFRESH_MAX_AGE_S = 30 * 24 * 60 * 60;

const COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	// Em dev roda em http://localhost — secure só em produção
	secure: !dev
} as const;

export interface ResolvedSession {
	user: SessionUser;
	defaultWorkspaceId: string;
	accessToken: string;
}

/** Grava os dois tokens da sessão em cookies httpOnly — o client nunca vê nenhum deles. */
export function setSessionCookies(cookies: Cookies, session: AuthSession) {
	cookies.set(ACCESS_COOKIE, session.accessToken, COOKIE_OPTIONS);
	cookies.set(REFRESH_COOKIE, session.refreshToken, {
		...COOKIE_OPTIONS,
		maxAge: REFRESH_MAX_AGE_S
	});
}

export function clearSessionCookies(cookies: Cookies) {
	cookies.delete(ACCESS_COOKIE, { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/' });
}

export function getRefreshToken(cookies: Cookies): string | undefined {
	return cookies.get(REFRESH_COOKIE);
}

/**
 * Resolve a sessão a partir dos cookies: valida o access token via /auth/me e,
 * se expirado, tenta renovar com o refresh token (rotacionando os cookies).
 * Retorna null quando não há sessão válida — quem chama decide o redirect.
 */
export async function resolveSession(cookies: Cookies): Promise<ResolvedSession | null> {
	const accessToken = cookies.get(ACCESS_COOKIE);
	if (accessToken) {
		const result = await authApi.me(accessToken);
		if (result.ok) {
			return { ...result.value, accessToken };
		}
	}

	const refreshToken = cookies.get(REFRESH_COOKIE);
	if (!refreshToken) return null;

	const renewed = await authApi.refresh(refreshToken);
	if (!renewed.ok) {
		clearSessionCookies(cookies);
		return null;
	}

	setSessionCookies(cookies, renewed.value);
	return {
		user: renewed.value.user,
		defaultWorkspaceId: renewed.value.defaultWorkspaceId,
		accessToken: renewed.value.accessToken
	};
}
