import { redirect } from '@sveltejs/kit';

import { getActiveWorkspaceId } from '$lib/server/active-workspace';
import * as workspaceApi from '$lib/server/workspace-api';

import type { LayoutServerLoad } from './$types';

/**
 * Guard das rotas autenticadas + contexto de workspace: resolve o workspace
 * ativo (cookie `_ws`, com fallback pro default do usuário) e a lista pro
 * seletor da topbar — toda página filha recebe isso via `data`.
 */
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	if (!locals.session) redirect(303, '/login');

	const { user, defaultWorkspaceId, accessToken } = locals.session;

	const result = await workspaceApi.listMyWorkspaces(accessToken);
	const workspaces = result.ok ? result.value : [];

	const requestedId = getActiveWorkspaceId(cookies);
	const activeWorkspace =
		workspaces.find((w) => w.id === requestedId) ??
		workspaces.find((w) => w.id === defaultWorkspaceId) ??
		workspaces[0] ??
		null;

	return { user, workspaces, activeWorkspace };
};
