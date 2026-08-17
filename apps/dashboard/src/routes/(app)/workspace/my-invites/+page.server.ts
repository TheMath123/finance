import { fail, redirect } from '@sveltejs/kit';

import * as workspaceApi from '$lib/server/workspace-api';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// redirectTo leva o usuário de volta pra cá depois de logar/criar conta —
	// é o destino do link de "Aceitar convite" no e-mail (ver create-invite.ts
	// no backend + workspace-invite.tsx no pacote email).
	if (!locals.session) redirect(303, '/login?redirectTo=/workspace/my-invites');

	const result = await workspaceApi.listMyInvites(locals.session.accessToken);
	return { myInvites: result.ok ? result.value : [] };
};

export const actions: Actions = {
	accept: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const inviteId = form.get('inviteId')?.toString() ?? '';

		const result = await workspaceApi.acceptInvite(locals.session.accessToken, inviteId);
		if (!result.ok) return fail(result.error.status || 500, { message: result.error.message });
		return { success: true };
	}
};
