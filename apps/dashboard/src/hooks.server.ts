import type { Handle } from '@sveltejs/kit';

import { resolveSession } from '$lib/server/session';

/**
 * Popula locals.user/locals.session a cada request (SSR) a partir dos cookies
 * httpOnly. O token nunca sai do servidor — páginas/loads usam locals, nunca
 * cookie direto.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = await resolveSession(event.cookies);
	return resolve(event);
};
