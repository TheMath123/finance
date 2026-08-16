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

/**
 * O backend devolve a mensagem genérica "E-mail ou senha inválidos." pro
 * código `invalid_credentials` em várias rotas (login, troca de senha, troca
 * de e-mail, exclusão de conta) — de propósito, pra não vazar se foi e-mail
 * ou senha que errou no LOGIN. Aqui o usuário já está logado e só digitou a
 * senha atual errada, então a mensagem genérica confunde (parece erro de
 * login). Troca só a exibição, o backend continua genérico.
 */
function currentPasswordErrorMessage(error: { code: string; message: string }) {
	return error.code === 'invalid_credentials' ? 'Senha atual incorreta.' : error.message;
}

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
			newPassword: form.get('newPassword')?.toString() ?? '',
			confirmNewPassword: form.get('confirmNewPassword')?.toString() ?? ''
		};

		const parsed = changePasswordSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { passwordMessage: parsed.error.issues[0]?.message });
		}

		// Passa o refresh token da sessão atual — só ele sobrevive à revogação
		// (senão a troca de senha deslogaria o próprio dashboard também).
		const currentRefreshToken = getRefreshToken(cookies);
		const result = await authApi.changePassword(locals.session.accessToken, {
			currentPassword: parsed.data.currentPassword,
			newPassword: parsed.data.newPassword,
			currentRefreshToken
		});
		if (!result.ok) {
			return fail(result.error.status || 500, {
				passwordMessage: currentPasswordErrorMessage(result.error)
			});
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
		if (!result.ok)
			return fail(result.error.status || 500, {
				emailMessage: currentPasswordErrorMessage(result.error)
			});
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

	linkGoogle: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const idToken = form.get('idToken')?.toString() ?? '';
		if (!idToken) return fail(400, { googleMessage: 'Token do Google ausente.' });

		const result = await authApi.linkGoogle(locals.session.accessToken, idToken);
		if (!result.ok)
			return fail(result.error.status || 500, { googleMessage: result.error.message });
		return { googleLinked: true };
	},

	unlinkGoogle: async ({ locals }) => {
		if (!locals.session) redirect(303, '/login');
		const result = await authApi.unlinkGoogle(locals.session.accessToken);
		if (!result.ok)
			return fail(result.error.status || 500, { googleMessage: result.error.message });
		return { googleUnlinked: true };
	},

	uploadAvatar: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login');
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { avatarMessage: 'Selecione uma imagem.' });
		}

		const result = await authApi.uploadAvatar(locals.session.accessToken, file);
		if (!result.ok)
			return fail(result.error.status || 500, { avatarMessage: result.error.message });
		return { avatarUploaded: true };
	},

	removeAvatar: async ({ locals }) => {
		if (!locals.session) redirect(303, '/login');
		const result = await authApi.removeAvatar(locals.session.accessToken);
		if (!result.ok)
			return fail(result.error.status || 500, { avatarMessage: result.error.message });
		return { avatarRemoved: true };
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
			return fail(result.error.status || 500, {
				deleteMessage: currentPasswordErrorMessage(result.error)
			});
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
