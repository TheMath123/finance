import { fail, redirect } from '@sveltejs/kit';

import { setActiveWorkspaceId } from '$lib/server/active-workspace';
import * as workspaceApi from '$lib/server/workspace-api';

import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';

		if (!name) return fail(400, { name, message: 'Informe um nome.' });

		const result = await workspaceApi.createWorkspace(locals.session.accessToken, { name });
		if (!result.ok) {
			return fail(result.error.status || 500, { name, message: result.error.message });
		}

		// Já entra no workspace recém-criado
		setActiveWorkspaceId(cookies, result.value.id);
		redirect(303, '/');
	}
};
