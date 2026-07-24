import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha Category (backend, domain/entities/category.ts — datas serializadas). */
export interface CategoryView {
	id: string;
	workspaceId: string;
	name: string;
	icon: string;
	color: string;
	isFallback: boolean;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
}

export function listCategories(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, CategoryView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/categories`, { accessToken });
}
