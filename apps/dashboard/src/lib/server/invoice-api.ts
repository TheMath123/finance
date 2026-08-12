import type { Either, InvoiceStatus, TransactionType } from '@finance/shared';

import { apiRequest, apiRequestMultipart, type ApiError } from './api-client';

/** Espelha InvoiceView (backend, use-cases/card/list-invoices.ts — datas serializadas). */
export interface InvoiceView {
	id: string;
	workspaceId: string;
	cardId: string;
	monthReference: number;
	yearReference: number;
	status: InvoiceStatus;
	effectiveStatus: InvoiceStatus;
	total: number;
	paymentTransactionId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ListInvoicesFilters {
	limit?: number;
	offset?: number;
	month?: number;
	year?: number;
}

export interface ListInvoicesResult {
	invoices: InvoiceView[];
	total: number;
	/** Fatura não paga mais antiga — destaque da tela, independente de página/filtro. */
	current: InvoiceView | null;
}

export function listInvoices(
	accessToken: string,
	workspaceId: string,
	cardId: string,
	filters: ListInvoicesFilters = {}
): Promise<Either<ApiError, ListInvoicesResult>> {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined) query.set(key, String(value));
	}
	const suffix = query.size > 0 ? `?${query}` : '';
	return apiRequest(`/workspaces/${workspaceId}/cards/${cardId}/invoices${suffix}`, {
		accessToken
	});
}

export function payInvoice(
	accessToken: string,
	workspaceId: string,
	invoiceId: string,
	input: { accountId: string; date: string; method: 'pix' | 'debit' }
): Promise<Either<ApiError, InvoiceView>> {
	return apiRequest(`/workspaces/${workspaceId}/invoices/${invoiceId}/pay`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

/** Espelha CsvImportRowInstallment (backend, use-cases/card/preview-invoice-csv-import.ts). */
export interface CsvImportRowInstallment {
	number: number;
	total: number;
}

export type CsvImportRowStatus = 'new' | 'duplicate' | 'invalid';

/** Espelha CsvImportPreviewRow (backend). */
export interface CsvImportPreviewRow {
	rowIndex: number;
	raw: string[];
	date: string | null;
	description: string | null;
	amount: number | null;
	type: TransactionType | null;
	status: CsvImportRowStatus;
	installment: CsvImportRowInstallment | null;
	suggestedCategoryId: string | null;
}

export interface CsvImportPreviewResult {
	delimiter: string;
	headerDetected: boolean;
	rows: CsvImportPreviewRow[];
}

export function previewInvoiceCsvImport(
	accessToken: string,
	workspaceId: string,
	cardId: string,
	input: { month: number; year: number; file: File }
): Promise<Either<ApiError, CsvImportPreviewResult>> {
	const formData = new FormData();
	formData.set('file', input.file);
	formData.set('month', String(input.month));
	formData.set('year', String(input.year));
	return apiRequestMultipart(`/workspaces/${workspaceId}/cards/${cardId}/csv-import/preview`, {
		formData,
		accessToken
	});
}

export interface ConfirmCsvImportRow {
	date: string;
	description: string;
	amount: number;
	categoryId: string;
	installment: CsvImportRowInstallment | null;
}

export interface ConfirmCsvImportResult {
	created: number;
	skippedDuplicates: number;
	skippedPaidInvoice: number;
}

export function confirmInvoiceCsvImport(
	accessToken: string,
	workspaceId: string,
	cardId: string,
	input: { month: number; year: number; rows: ConfirmCsvImportRow[] }
): Promise<Either<ApiError, ConfirmCsvImportResult>> {
	return apiRequest(`/workspaces/${workspaceId}/cards/${cardId}/csv-import/confirm`, {
		method: 'POST',
		body: input,
		accessToken
	});
}
