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

export interface CategoryInput {
	name: string;
	icon: string;
	color: string;
}

export function listCategories(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, CategoryView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/categories`, { accessToken });
}

export function createCategory(
	accessToken: string,
	workspaceId: string,
	input: CategoryInput
): Promise<Either<ApiError, CategoryView>> {
	return apiRequest(`/workspaces/${workspaceId}/categories`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updateCategory(
	accessToken: string,
	workspaceId: string,
	categoryId: string,
	input: Partial<CategoryInput>
): Promise<Either<ApiError, CategoryView>> {
	return apiRequest(`/workspaces/${workspaceId}/categories/${categoryId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function deleteCategory(
	accessToken: string,
	workspaceId: string,
	categoryId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/categories/${categoryId}`, {
		method: 'DELETE',
		accessToken
	});
}
