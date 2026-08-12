import type { Either } from '@finance/shared';

import { apiRequest, apiRequestMultipart, type ApiError } from './api-client';

export function uploadAttachment(
	accessToken: string,
	workspaceId: string,
	transactionId: string,
	file: File
): Promise<Either<ApiError, { attachmentKey: string }>> {
	const formData = new FormData();
	formData.set('file', file);
	return apiRequestMultipart(
		`/workspaces/${workspaceId}/transactions/${transactionId}/attachment`,
		{
			formData,
			accessToken
		}
	);
}

export function getAttachmentUrl(
	accessToken: string,
	workspaceId: string,
	transactionId: string
): Promise<Either<ApiError, { url: string }>> {
	return apiRequest(`/workspaces/${workspaceId}/transactions/${transactionId}/attachment`, {
		accessToken
	});
}

export function deleteAttachment(
	accessToken: string,
	workspaceId: string,
	transactionId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/transactions/${transactionId}/attachment`, {
		method: 'DELETE',
		accessToken
	});
}
