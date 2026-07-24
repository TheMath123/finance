import { type Cookies, fail, redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as workspaceApi from '$lib/server/workspace-api';

import type { Actions } from './$types';

function resolveWorkspaceId(cookies: Cookies, fallback: string): string {
	return getActiveWorkspaceId(cookies) ?? fallback;
}

// Criar workspace novo mora em /workspace/new (botão "+" na topbar) — aqui é
// só configuração do workspace ativo.
export const actions: Actions = {
	rename: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const workspaceId = resolveWorkspaceId(cookies, locals.session.defaultWorkspaceId);

		if (!name) return fail(400, { renameMessage: 'Informe um nome.' });

		const result = await workspaceApi.updateWorkspace(locals.session.accessToken, workspaceId, {
			name
		});
		if (!result.ok) {
			return fail(result.error.status || 500, { renameMessage: result.error.message });
		}
		return { renamed: true };
	}
};
