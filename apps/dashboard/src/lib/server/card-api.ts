import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha CardWithLimit (backend, use-cases/card/list-cards.ts — datas serializadas). */
export interface CardView {
	id: string;
	workspaceId: string;
	bankId: string;
	name: string;
	limit: number;
	availableLimit: number;
	bankCode: string;
	closingDay: number;
	dueDay: number;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CardInput {
	name: string;
	bankCode: string;
	limit: number;
	closingDay: number;
	dueDay: number;
}

export function listCards(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, CardView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/cards`, { accessToken });
}

export function createCard(
	accessToken: string,
	workspaceId: string,
	input: CardInput
): Promise<Either<ApiError, CardView>> {
	return apiRequest(`/workspaces/${workspaceId}/cards`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updateCard(
	accessToken: string,
	workspaceId: string,
	cardId: string,
	input: Partial<CardInput>
): Promise<Either<ApiError, CardView>> {
	return apiRequest(`/workspaces/${workspaceId}/cards/${cardId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function archiveCard(
	accessToken: string,
	workspaceId: string,
	cardId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/cards/${cardId}/archive`, {
		method: 'POST',
		accessToken
	});
}

export function deleteCard(
	accessToken: string,
	workspaceId: string,
	cardId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/cards/${cardId}`, {
		method: 'DELETE',
		accessToken
	});
}
