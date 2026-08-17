/**
 * Só aceita caminho relativo interno começando com uma única barra — evita
 * open redirect via `?redirectTo=//evil.com` ou `?redirectTo=https://evil.com`
 * (ambos passariam por um `startsWith('/')` sozinho: `//host` é
 * protocol-relative, o browser trata como absoluto pro host errado).
 */
export function safeRedirectTarget(raw: string | null | undefined, fallback = '/'): string {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
	return raw;
}
