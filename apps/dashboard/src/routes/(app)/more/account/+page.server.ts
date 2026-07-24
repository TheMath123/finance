import { fail, redirect } from '@sveltejs/kit';

import {
	changePasswordSchema,
	confirmCodeSchema,
	requestAccountDeletionSchema,
	requestEmailChangeSchema
} from '$lib/schemas/account';
import * as authApi from '$lib/server/auth-api';
import { clearSessionCookies, getRefreshToken } from '$lib/server/session';
import { revokeWhatsAppLink } from '$lib/server/whatsapp-api';

import type { Actions } from './$types';

export const actions: Actions = {
	updateName: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { nameMessage: 'Informe um nome.' });

		const result = await authApi.updateName(locals.session.accessToken, name);
		if (!result.ok) return fail(result.error.status || 500, { nameMessage: result.error.message });
		return { nameUpdated: true };
	},

	changePassword: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const raw = {
			currentPassword: form.get('currentPassword')?.toString() ?? '',
			newPassword: form.get('newPassword')?.toString() ?? ''
		};

		const parsed = changePasswordSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { passwordMessage: parsed.error.issues[0]?.message });
		}

		// Passa o refresh token da sessão atual — só ele sobrevive à revogação
		// (senão a troca de senha deslogaria o próprio dashboard também).
		const currentRefreshToken = getRefreshToken(cookies);
		const result = await authApi.changePassword(locals.session.accessToken, {
			...parsed.data,
			currentRefreshToken
		});
		if (!result.ok) {
			return fail(result.error.status || 500, { passwordMessage: result.error.message });
		}
		return { passwordChanged: true };
	},

	requestEmailChange: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const raw = {
			newEmail: form.get('newEmail')?.toString().trim() ?? '',
			currentPassword: form.get('currentPassword')?.toString() ?? ''
		};

		const parsed = requestEmailChangeSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { emailMessage: parsed.error.issues[0]?.message });
		}

		const result = await authApi.requestEmailChange(locals.session.accessToken, parsed.data);
		if (!result.ok) return fail(result.error.status || 500, { emailMessage: result.error.message });
		return { emailChangeRequested: true };
	},

	confirmEmailChange: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const parsed = confirmCodeSchema.safeParse({ code: form.get('code')?.toString() ?? '' });
		if (!parsed.success) {
			return fail(400, { emailMessage: parsed.error.issues[0]?.message });
		}

		const result = await authApi.confirmEmailChange(locals.session.accessToken, parsed.data.code);
		if (!result.ok) return fail(result.error.status || 500, { emailMessage: result.error.message });
		return { emailChanged: true };
	},

	revokeWhatsapp: async ({ locals }) => {
		if (!locals.session) redirect(303, '/login');
		const result = await revokeWhatsAppLink(locals.session.accessToken);
		if (!result.ok)
			return fail(result.error.status || 500, { whatsappMessage: result.error.message });
		return { whatsappRevoked: true };
	},

	requestDeletion: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const parsed = requestAccountDeletionSchema.safeParse({
			password: form.get('password')?.toString() ?? ''
		});
		if (!parsed.success) {
			return fail(400, { deleteMessage: parsed.error.issues[0]?.message });
		}

		const result = await authApi.requestAccountDeletion(
			locals.session.accessToken,
			parsed.data.password
		);
		if (!result.ok) {
			return fail(result.error.status || 500, { deleteMessage: result.error.message });
		}
		return { deletionRequested: true };
	},

	confirmDeletion: async ({ request, cookies, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const parsed = confirmCodeSchema.safeParse({ code: form.get('code')?.toString() ?? '' });
		if (!parsed.success) {
			return fail(400, { deleteMessage: parsed.error.issues[0]?.message });
		}

		const result = await authApi.confirmAccountDeletion(
			locals.session.accessToken,
			parsed.data.code
		);
		if (!result.ok) {
			return fail(result.error.status || 500, { deleteMessage: result.error.message });
		}

		// Conta apagada de verdade no backend — encerra a sessão local igual ao logout.
		clearSessionCookies(cookies);
		redirect(303, '/login');
	}
};
