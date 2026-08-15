import { redirect } from '@sveltejs/kit';
import { SUPPORTED_LANGS } from '../params/lang';

/** Detecta o idioma preferido a partir do header `Accept-Language`, com pt como padrão. */
function preferredLang(acceptLanguage: string | null): string {
	if (!acceptLanguage) return 'pt';
	const tags = acceptLanguage.split(',').map((tag) => tag.split(';')[0].trim().slice(0, 2));
	const match = tags.find((tag) => (SUPPORTED_LANGS as readonly string[]).includes(tag));
	return match ?? 'pt';
}

export function load({ request }) {
	throw redirect(307, `/${preferredLang(request.headers.get('accept-language'))}`);
}
