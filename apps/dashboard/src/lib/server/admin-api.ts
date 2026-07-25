import type { Either, PlatformRole } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha AdminUserView (backend, use-cases/admin/list-users.ts — nunca inclui passwordHash). */
export interface AdminUserView {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	platformRole: PlatformRole;
	emailVerifiedAt: string | null;
	suspendedAt: string | null;
	createdAt: string;
}

export interface ListUsersOutput {
	users: AdminUserView[];
	total: number;
}

export function listUsers(
	accessToken: string,
	params: { search?: string; limit: number; offset: number }
): Promise<Either<ApiError, ListUsersOutput>> {
	const query = new URLSearchParams();
	if (params.search) query.set('search', params.search);
	query.set('limit', String(params.limit));
	query.set('offset', String(params.offset));
	return apiRequest(`/admin/users?${query}`, { accessToken });
}

export function suspendUser(
	accessToken: string,
	userId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/admin/users/${userId}/suspend`, { method: 'POST', accessToken });
}

export function reactivateUser(
	accessToken: string,
	userId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/admin/users/${userId}/reactivate`, {
		method: 'POST',
		accessToken
	});
}

/** Espelha DefaultCategory (backend, ports/default-category-repository.ts — datas serializadas). */
export interface DefaultCategoryView {
	id: string;
	name: string;
	icon: string;
	color: string;
	isFallback: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface DefaultCategoryInput {
	name: string;
	icon: string;
	color: string;
	isFallback: boolean;
}

export function listDefaultCategories(
	accessToken: string
): Promise<Either<ApiError, DefaultCategoryView[]>> {
	return apiRequest('/admin/default-categories', { accessToken });
}

export function createDefaultCategory(
	accessToken: string,
	input: DefaultCategoryInput
): Promise<Either<ApiError, DefaultCategoryView>> {
	return apiRequest('/admin/default-categories', {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updateDefaultCategory(
	accessToken: string,
	categoryId: string,
	input: Partial<DefaultCategoryInput>
): Promise<Either<ApiError, DefaultCategoryView>> {
	return apiRequest(`/admin/default-categories/${categoryId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function deleteDefaultCategory(
	accessToken: string,
	categoryId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/admin/default-categories/${categoryId}`, {
		method: 'DELETE',
		accessToken
	});
}
