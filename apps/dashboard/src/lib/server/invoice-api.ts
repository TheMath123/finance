import type { Either, InvoiceStatus } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

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
