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

let clarityLoaded = false;

/**
 * Injeta o script do Microsoft Clarity (heatmap/gravação de sessão) — só
 * deve ser chamado depois que o visitante consentir com cookies de
 * rastreio (`getConsent() === 'all'`). Mesma implementação de
 * apps/dashboard/src/lib/cookie-consent.ts — `document.createElement` +
 * `appendChild` (em vez de `{@html}`/`innerHTML`) porque scripts inseridos
 * via `innerHTML` não executam.
 */
export function loadClarity(projectId: string): void {
	if (typeof document === 'undefined' || clarityLoaded) return;
	clarityLoaded = true;
	const script = document.createElement('script');
	script.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window, document, "clarity", "script", "${projectId}");`;
	document.head.appendChild(script);
}
