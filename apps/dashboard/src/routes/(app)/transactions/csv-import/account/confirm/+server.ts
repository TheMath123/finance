import { redirect } from '@sveltejs/kit';

import * as accountApi from '$lib/server/account-api';
import { getActiveWorkspaceId } from '$lib/server/active-workspace';

import type { RequestHandler } from './$types';

/** Proxy da confirmação de import de CSV direto pra conta — ver preview ao lado. */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	if (!locals.session) redirect(303, '/login');
	const workspaceId = getActiveWorkspaceId(cookies) ?? locals.session.defaultWorkspaceId;

	const body = await request.json();
	const { accountId, ...input } = body ?? {};
	if (typeof accountId !== 'string' || !accountId) {
		return Response.json(
			{ error: { code: 'validation_error', message: 'Conta não informada.' } },
			{ status: 400 }
		);
	}

	const result = await accountApi.confirmAccountCsvImport(
		locals.session.accessToken,
		workspaceId,
		accountId,
		input
	);
	if (!result.ok) {
		return Response.json({ error: result.error }, { status: result.error.status || 500 });
	}
	return Response.json(result.value);
};
