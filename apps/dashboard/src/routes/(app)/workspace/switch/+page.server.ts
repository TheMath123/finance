import { redirect } from '@sveltejs/kit';

import { setActiveWorkspaceId } from '$lib/server/active-workspace';
import * as workspaceApi from '$lib/server/workspace-api';

import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const workspaceId = form.get('workspaceId')?.toString();

		// Só grava se o workspace realmente pertence ao usuário — cookie não é
		// confiável como fonte de autorização, mas nem vale gravar lixo.
		if (locals.session && workspaceId) {
			const result = await workspaceApi.listMyWorkspaces(locals.session.accessToken);
			if (result.ok && result.value.some((w) => w.id === workspaceId)) {
				setActiveWorkspaceId(cookies, workspaceId);
			}
		}

		redirect(303, '/');
	}
};
