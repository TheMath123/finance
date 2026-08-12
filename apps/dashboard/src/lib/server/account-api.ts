import type { AccountType, Either, TransactionType } from '@finance/shared';

import { apiRequest, apiRequestMultipart, type ApiError } from './api-client';

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

export type AccountCsvImportRowStatus = 'new' | 'duplicate' | 'invalid';

/** Espelha AccountCsvImportPreviewRow (backend) — sem installment, ao contrário do import de fatura. */
export interface AccountCsvImportPreviewRow {
	rowIndex: number;
	raw: string[];
	date: string | null;
	description: string | null;
	amount: number | null;
	type: TransactionType | null;
	status: AccountCsvImportRowStatus;
	suggestedCategoryId: string | null;
}

export interface AccountCsvImportPreviewResult {
	delimiter: string;
	headerDetected: boolean;
	rows: AccountCsvImportPreviewRow[];
}

export function previewAccountCsvImport(
	accessToken: string,
	workspaceId: string,
	accountId: string,
	input: { file: File }
): Promise<Either<ApiError, AccountCsvImportPreviewResult>> {
	const formData = new FormData();
	formData.set('file', input.file);
	return apiRequestMultipart(
		`/workspaces/${workspaceId}/accounts/${accountId}/csv-import/preview`,
		{ formData, accessToken }
	);
}

export interface ConfirmAccountCsvImportRow {
	date: string;
	description: string;
	amount: number;
	categoryId: string;
}

export interface ConfirmAccountCsvImportResult {
	created: number;
	skippedDuplicates: number;
}

export function confirmAccountCsvImport(
	accessToken: string,
	workspaceId: string,
	accountId: string,
	input: {
		method: 'pix' | 'debit' | 'cash';
		rows: ConfirmAccountCsvImportRow[];
	}
): Promise<Either<ApiError, ConfirmAccountCsvImportResult>> {
	return apiRequest(`/workspaces/${workspaceId}/accounts/${accountId}/csv-import/confirm`, {
		method: 'POST',
		body: input,
		accessToken
	});
}
