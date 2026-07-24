import type { Either, RecurrenceFrequency, TransactionType } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Transferência recorrente fica fora do M1 (schema não tem conta destino). */
export type RecurringMethod = 'pix' | 'debit' | 'cash' | 'credit';

/** Espelha RecurringTransaction (backend, domain/entities/recurring-transaction.ts — datas serializadas). */
export interface RecurringView {
	id: string;
	workspaceId: string;
	description: string;
	amount: number;
	type: TransactionType;
	method: RecurringMethod;
	categoryId: string;
	accountId: string | null;
	cardId: string | null;
	frequency: RecurrenceFrequency;
	/** Dia do mês (1-31) pra monthly/yearly, ou dia da semana 0-6 (domingo=0) pra weekly. */
	dayOfReference: number;
	/** Só usado se frequency="yearly" (1-12). */
	monthOfReference: number | null;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface RecurringInput {
	description: string;
	amount: number;
	type: TransactionType;
	method: RecurringMethod;
	categoryId: string;
	accountId?: string;
	cardId?: string;
	frequency: RecurrenceFrequency;
	dayOfReference: number;
	monthOfReference?: number;
	active?: boolean;
}

export function listRecurring(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, RecurringView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/recurring`, { accessToken });
}

export function createRecurring(
	accessToken: string,
	workspaceId: string,
	input: RecurringInput
): Promise<Either<ApiError, RecurringView>> {
	return apiRequest(`/workspaces/${workspaceId}/recurring`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updateRecurring(
	accessToken: string,
	workspaceId: string,
	recurringId: string,
	input: Partial<RecurringInput>
): Promise<Either<ApiError, RecurringView>> {
	return apiRequest(`/workspaces/${workspaceId}/recurring/${recurringId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function deleteRecurring(
	accessToken: string,
	workspaceId: string,
	recurringId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/recurring/${recurringId}`, {
		method: 'DELETE',
		accessToken
	});
}
