import { json } from '@sveltejs/kit';

import * as authApi from '$lib/server/auth-api';
import { setSessionCookies } from '$lib/server/session';

import type { RequestHandler } from './$types';

/**
 * Endpoint dedicado (não `login/+page.server.ts`) porque aquele arquivo já
 * tem uma action `default` — SvelteKit não deixa misturar `default` com
 * actions nomeadas no mesmo arquivo. Devolve JSON, nunca `redirect()`: quem
 * chama é um `fetch` do callback do Google Identity Services, e `fetch`
 * segue redirect automaticamente — devolveria o HTML da página final como
 * corpo em vez de navegar o browser. Quem navega é o próprio client, depois
 * do `fetch` dar certo (ver google-sign-in-button.svelte).
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => null);
	const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
	if (!idToken) return json({ error: { message: 'Token do Google ausente.' } }, { status: 400 });

	const result = await authApi.googleSignIn({ idToken, termsAccepted: true });
	if (!result.ok) {
		return json(
			{ error: { message: result.error.message } },
			{ status: result.error.status || 503 }
		);
	}

	setSessionCookies(cookies, result.value);
	return json({ ok: true });
};
