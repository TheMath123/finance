import type { AccountType, Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha AccountWithBalance (backend, use-cases/account/list-accounts.ts — datas serializadas). */
export interface AccountView {
	id: string;
	workspaceId: string;
	bankId: string;
	name: string;
	type: AccountType;
	initialBalance: number;
	balance: number;
	bankCode: string;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AccountInput {
	name: string;
	bankCode: string;
	type: AccountType;
	initialBalance: number;
}

export function listAccounts(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, AccountView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/accounts`, { accessToken });
}

export function createAccount(
	accessToken: string,
	workspaceId: string,
	input: AccountInput
): Promise<Either<ApiError, AccountView>> {
	return apiRequest(`/workspaces/${workspaceId}/accounts`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updateAccount(
	accessToken: string,
	workspaceId: string,
	accountId: string,
	input: Partial<AccountInput>
): Promise<Either<ApiError, AccountView>> {
	return apiRequest(`/workspaces/${workspaceId}/accounts/${accountId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function archiveAccount(
	accessToken: string,
	workspaceId: string,
	accountId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/accounts/${accountId}/archive`, {
		method: 'POST',
		accessToken
	});
}

export function deleteAccount(
	accessToken: string,
	workspaceId: string,
	accountId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/accounts/${accountId}`, {
		method: 'DELETE',
		accessToken
	});
}
