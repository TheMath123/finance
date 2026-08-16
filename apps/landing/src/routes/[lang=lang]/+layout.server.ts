import { CONSENT_COOKIE_NAME, parseConsent } from '$lib/cookie-consent';

/**
 * Lê o cookie de consentimento na própria request (`event.cookies`, não
 * `document.cookie` — no servidor não existe `document`). Sem isso, o SSR
 * não tinha como saber se o visitante já tinha escolhido, e o HTML inicial
 * sempre vinha com o banner visível por padrão — só sumia depois de
 * hidratar e reler o cookie no client, o que aparecia como o banner
 * "piscando" na tela a cada F5 até pra quem já tinha aceitado antes.
 */
export function load({ cookies }) {
	return { cookieConsent: parseConsent(cookies.get(CONSENT_COOKIE_NAME)) };
}
