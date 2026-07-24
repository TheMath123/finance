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

export function listInvoices(
	accessToken: string,
	workspaceId: string,
	cardId: string
): Promise<Either<ApiError, InvoiceView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/cards/${cardId}/invoices`, { accessToken });
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
