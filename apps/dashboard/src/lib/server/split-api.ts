import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

export type SplitShareStatus = 'pending' | 'paid' | 'confirmed';

export interface CreateSplitParticipant {
	type: 'user' | 'external';
	contact?: string;
	name?: string;
	amount?: number;
}

export interface ExpenseSplit {
	id: string;
	transactionId: string;
	createdBy: string;
	cancelledAt: string | null;
	createdAt: string;
	updatedAt: string;
}

/** Espelha OwedByMeShare (backend, use-cases/split/list-owed-by-me.ts). */
export interface OwedByMeShare {
	shareId: string;
	splitId: string;
	amount: number;
	status: SplitShareStatus;
	transactionDescription: string;
	creatorName: string;
}

/** Espelha OwedToMeShare (backend, use-cases/split/list-owed-to-me.ts). */
export interface OwedToMeShare {
	shareId: string;
	splitId: string;
	amount: number;
	status: SplitShareStatus;
	transactionDescription: string;
	participantName: string;
	participantUserId: string | null;
}

export function createSplit(
	accessToken: string,
	workspaceId: string,
	transactionId: string,
	participants: CreateSplitParticipant[]
): Promise<Either<ApiError, ExpenseSplit>> {
	return apiRequest(`/workspaces/${workspaceId}/transactions/${transactionId}/split`, {
		method: 'POST',
		body: { participants },
		accessToken
	});
}

export function cancelSplit(
	accessToken: string,
	splitId: string
): Promise<Either<ApiError, ExpenseSplit>> {
	return apiRequest(`/splits/${splitId}/cancel`, { method: 'POST', accessToken });
}

export function markSharePaid(
	accessToken: string,
	shareId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/split-shares/${shareId}/paid`, { method: 'POST', accessToken });
}

export function confirmShare(
	accessToken: string,
	shareId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/split-shares/${shareId}/confirm`, { method: 'POST', accessToken });
}

export function listOwedByMe(accessToken: string): Promise<Either<ApiError, OwedByMeShare[]>> {
	return apiRequest('/splits/owed-by-me', { accessToken });
}

export function listOwedToMe(accessToken: string): Promise<Either<ApiError, OwedToMeShare[]>> {
	return apiRequest('/splits/owed-to-me', { accessToken });
}
