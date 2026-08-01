import type { Either, TransactionMethod, TransactionType } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha TransactionListItem (backend, use-cases/transaction/list-transactions.ts). */
export interface TransactionView {
	id: string;
	workspaceId: string;
	createdBy: string | null;
	description: string;
	amount: number;
	type: TransactionType;
	method: TransactionMethod;
	date: string;
	categoryId: string;
	accountId: string | null;
	toAccountId: string | null;
	cardId: string | null;
	invoiceId: string | null;
	installmentNumber: number | null;
	installmentTotal: number | null;
	installmentGroupId: string | null;
	recurringId: string | null;
	source: string;
	attachmentKey: string | null;
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
	hasActiveSplit: boolean;
}

export interface ListTransactionsFilters {
	from?: string;
	to?: string;
	categoryId?: string;
	accountId?: string;
	cardId?: string;
	q?: string;
	limit?: number;
	offset?: number;
	deletedOnly?: boolean;
}

export interface CreateTransactionInput {
	description: string;
	amount: number;
	type: TransactionType;
	method: TransactionMethod;
	date: string;
	categoryId: string;
	accountId?: string;
	toAccountId?: string;
	cardId?: string;
	installments?: number;
}

export interface UpdateTransactionInput {
	description?: string;
	amount?: number;
	categoryId?: string;
	date?: string;
	accountId?: string;
	cardId?: string;
}

export function listTransactions(
	accessToken: string,
	workspaceId: string,
	filters: ListTransactionsFilters = {}
): Promise<Either<ApiError, TransactionView[]>> {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		// z.coerce.boolean() no backend trata QUALQUER string não-vazia como
		// true — inclusive "false" — então "deletedOnly=false" nunca pode ser
		// enviado; omitir é o único jeito de pedir "não-arquivadas".
		if (value === false) continue;
		if (value !== undefined && value !== '') query.set(key, String(value));
	}
	const suffix = query.size > 0 ? `?${query}` : '';
	return apiRequest(`/workspaces/${workspaceId}/transactions${suffix}`, { accessToken });
}

export function createTransaction(
	accessToken: string,
	workspaceId: string,
	input: CreateTransactionInput
): Promise<Either<ApiError, TransactionView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/transactions`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updateTransaction(
	accessToken: string,
	workspaceId: string,
	transactionId: string,
	input: UpdateTransactionInput
): Promise<Either<ApiError, TransactionView>> {
	return apiRequest(`/workspaces/${workspaceId}/transactions/${transactionId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

/** Edita o valor TOTAL de uma compra parcelada — redivide só entre as parcelas ainda não pagas. */
export function updateInstallmentTotal(
	accessToken: string,
	workspaceId: string,
	transactionId: string,
	newTotalAmount: number
): Promise<Either<ApiError, TransactionView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/transactions/${transactionId}/installment-total`, {
		method: 'PATCH',
		body: { newTotalAmount },
		accessToken
	});
}

export function deleteTransaction(
	accessToken: string,
	workspaceId: string,
	transactionId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/transactions/${transactionId}`, {
		method: 'DELETE',
		accessToken
	});
}

export function restoreTransaction(
	accessToken: string,
	workspaceId: string,
	transactionId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/transactions/${transactionId}/restore`, {
		method: 'POST',
		accessToken
	});
}
