const COOKIE_NAME = 'cookie_consent';
const MAX_AGE_DAYS = 180;

export type ConsentValue = 'necessary' | 'all';

/**
 * Lê a decisão de consentimento de cookies salva (ou `null` se o visitante
 * ainda não escolheu). Cookie próprio, não-httpOnly — é só uma preferência
 * de UI, não dado sensível.
 */
export function getConsent(): ConsentValue | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
	const value = match?.[1];
	return value === 'all' || value === 'necessary' ? value : null;
}

export function setConsent(value: ConsentValue): void {
	if (typeof document === 'undefined') return;
	const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
	document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}
