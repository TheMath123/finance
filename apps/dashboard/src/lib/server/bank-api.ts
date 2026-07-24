import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha Bank (backend, domain/entities/bank.ts — datas serializadas). */
export interface BankView {
	id: string;
	workspaceId: string;
	name: string;
	bankCode: string;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export function listBanks(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, BankView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/banks`, { accessToken });
}

export function createBank(
	accessToken: string,
	workspaceId: string,
	input: { name: string; bankCode: string }
): Promise<Either<ApiError, BankView>> {
	return apiRequest(`/workspaces/${workspaceId}/banks`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updateBank(
	accessToken: string,
	workspaceId: string,
	bankId: string,
	input: { name?: string; bankCode?: string }
): Promise<Either<ApiError, BankView>> {
	return apiRequest(`/workspaces/${workspaceId}/banks/${bankId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function archiveBank(
	accessToken: string,
	workspaceId: string,
	bankId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/banks/${bankId}/archive`, {
		method: 'POST',
		accessToken
	});
}

export function deleteBank(
	accessToken: string,
	workspaceId: string,
	bankId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/banks/${bankId}`, {
		method: 'DELETE',
		accessToken
	});
}
