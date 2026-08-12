import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

export type TransferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface Transfer {
	id: string;
	fromTransactionId: string;
	toTransactionId: string | null;
	amount: number;
	description: string;
	status: TransferStatus;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
}

/** Espelha PendingTransfer (backend, use-cases/transfer/list-pending-transfers.ts). */
export interface PendingTransfer {
	id: string;
	amount: number;
	description: string;
	expiresAt: string;
	createdAt: string;
	fromUserName: string;
}

/** Espelha TransferAccountOption — contas do usuário logado em qualquer workspace seu. */
export interface TransferAccountOption {
	accountId: string;
	accountName: string;
	workspaceId: string;
	workspaceName: string;
}

export interface TrustedContact {
	id: string;
	userId: string;
	trustedUserId: string;
	defaultAccountId: string;
	createdAt: string;
	trustedUserName: string;
}

export interface CreateTransferInput {
	recipient: string;
	amount: number;
	description: string;
	accountId: string;
}

export function createTransfer(
	accessToken: string,
	workspaceId: string,
	input: CreateTransferInput
): Promise<Either<ApiError, Transfer>> {
	return apiRequest(`/workspaces/${workspaceId}/transfers`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function listPendingTransfers(
	accessToken: string
): Promise<Either<ApiError, PendingTransfer[]>> {
	return apiRequest('/transfers/pending', { accessToken });
}

/** Contas do usuário logado em qualquer workspace seu — escolha de destino no aceite. */
export function listTransferAccounts(
	accessToken: string
): Promise<Either<ApiError, TransferAccountOption[]>> {
	return apiRequest('/transfers/accounts', { accessToken });
}

export function acceptTransfer(
	accessToken: string,
	transferId: string,
	input: { accountId: string; markTrusted?: boolean }
): Promise<Either<ApiError, Transfer>> {
	return apiRequest(`/transfers/${transferId}/accept`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function rejectTransfer(
	accessToken: string,
	transferId: string
): Promise<Either<ApiError, Transfer>> {
	return apiRequest(`/transfers/${transferId}/reject`, { method: 'POST', accessToken });
}

export function listTrustedContacts(
	accessToken: string
): Promise<Either<ApiError, TrustedContact[]>> {
	return apiRequest('/trusted-contacts', { accessToken });
}

export function removeTrustedContact(
	accessToken: string,
	id: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/trusted-contacts/${id}`, { method: 'DELETE', accessToken });
}
