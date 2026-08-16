const COOKIE_NAME = 'cookie_consent';
const MAX_AGE_DAYS = 180;

export type ConsentValue = 'necessary' | 'all';

/**
 * Lê a decisão de consentimento de cookies salva (ou `null` se o visitante
 * ainda não escolheu). Cookie próprio, não-httpOnly — é só uma preferência
 * de UI, não dado sensível, então dá pra ler/escrever direto pelo browser
 * sem passar pelo backend.
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

let clarityLoaded = false;

/**
 * Injeta o script do Microsoft Clarity (heatmap/gravação de sessão) — só
 * deve ser chamado depois que o visitante consentir com cookies de
 * rastreio (`getConsent() === 'all'`). `document.createElement` +
 * `appendChild` (em vez de `{@html}`/`innerHTML`) porque scripts inseridos
 * via `innerHTML` não executam — precisa ser um node de verdade pro
 * browser rodar o conteúdo (mesmo padrão de `google-identity.ts`).
 */
export function loadClarity(projectId: string): void {
	if (typeof document === 'undefined' || clarityLoaded) return;
	clarityLoaded = true;
	const script = document.createElement('script');
	script.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window, document, "clarity", "script", "${projectId}");`;
	document.head.appendChild(script);
}
