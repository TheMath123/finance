import { error, redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

/**
 * Guard da área administrativa (M4-07): 404, não 403 — não revela pra um
 * usuário comum que a área existe (spec).
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, '/login');
	if (locals.session.user.platformRole !== 'superadmin') error(404);

	return { user: locals.session.user };
};
