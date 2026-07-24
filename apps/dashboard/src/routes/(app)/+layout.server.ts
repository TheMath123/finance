import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

/** Guard das rotas autenticadas: sem sessão válida, volta pro login. */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');

	return {
		user: locals.session.user,
		defaultWorkspaceId: locals.session.defaultWorkspaceId
	};
};
