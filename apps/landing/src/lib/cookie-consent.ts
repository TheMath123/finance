export const CONSENT_COOKIE_NAME = 'cookie_consent';
const MAX_AGE_DAYS = 180;

export type ConsentValue = 'necessary' | 'all';

export function parseConsent(raw: string | undefined | null): ConsentValue | null {
	return raw === 'all' || raw === 'necessary' ? raw : null;
}

/**
 * Lê a decisão de consentimento de cookies salva (ou `null` se o visitante
 * ainda não escolheu). Cookie próprio, não-httpOnly — é só uma preferência
 * de UI, não dado sensível.
 *
 * Só funciona no client (`document.cookie`) — o valor usado na primeira
 * renderização (SSR) vem de `+layout.server.ts`, que lê o mesmo cookie via
 * `event.cookies` (a única forma de saber o valor ANTES de enviar o HTML;
 * sem isso o servidor não tem como saber se o visitante já decidiu, e o
 * banner piscaria na tela a cada F5 pra quem já tinha aceitado).
 */
export function getConsent(): ConsentValue | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`));
	return parseConsent(match?.[1]);
}

export function setConsent(value: ConsentValue): void {
	if (typeof document === 'undefined') return;
	const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
	document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}
