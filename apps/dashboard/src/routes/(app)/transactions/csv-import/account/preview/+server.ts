import { redirect } from '@sveltejs/kit';

import * as accountApi from '$lib/server/account-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';

import type { RequestHandler } from './$types';

/** Proxy do preview de import de CSV direto pra conta — `accountId` vem do formData, sem mês/ano (sem fatura). */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	if (!locals.session) redirect(303, '/login');
	const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

	const formData = await request.formData();
	const file = formData.get('file');
	const accountId = formData.get('accountId');
	if (!(file instanceof File) || typeof accountId !== 'string' || !accountId) {
		return Response.json(
			{ error: { code: 'validation_error', message: 'Dados inválidos.' } },
			{ status: 400 }
		);
	}

	const result = await accountApi.previewAccountCsvImport(
		locals.session.accessToken,
		workspaceId,
		accountId,
		{ file }
	);
	if (!result.ok) {
		return Response.json({ error: result.error }, { status: result.error.status || 500 });
	}
	return Response.json(result.value);
};
