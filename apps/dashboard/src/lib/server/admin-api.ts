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
	planName: string | null;
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

/** Espelha AiSettings (backend, ports/ai-settings-repository.ts — singleton). */
export interface AiSettingsView {
	id: string;
	dailyTokenBudgetPerUser: number;
	updatedAt: string;
}

export function getAiSettings(accessToken: string): Promise<Either<ApiError, AiSettingsView>> {
	return apiRequest('/admin/ai-settings', { accessToken });
}

export function updateAiSettings(
	accessToken: string,
	dailyTokenBudgetPerUser: number
): Promise<Either<ApiError, AiSettingsView>> {
	return apiRequest('/admin/ai-settings', {
		method: 'PATCH',
		body: { dailyTokenBudgetPerUser },
		accessToken
	});
}

/** Espelha FeatureFlag (backend, ports/feature-flag-repository.ts). */
export interface FeatureFlagView {
	id: string;
	key: string;
	enabled: boolean;
	description: string | null;
	/** Flag predefinida da plataforma no seed original (seed via migration). */
	isSystem: boolean;
	createdAt: string;
	updatedAt: string;
}

export function listFeatureFlags(
	accessToken: string
): Promise<Either<ApiError, FeatureFlagView[]>> {
	return apiRequest('/admin/feature-flags', { accessToken });
}

export function updateFeatureFlag(
	accessToken: string,
	key: string,
	input: { enabled: boolean }
): Promise<Either<ApiError, FeatureFlagView>> {
	return apiRequest(`/admin/feature-flags/${key}`, {
		method: 'PUT',
		body: input,
		accessToken
	});
}

/** Espelha PlatformMetrics (backend, use-cases/admin/get-platform-metrics.ts). */
export interface PlatformMetricsView {
	totalUsers: number;
	suspendedUsers: number;
	workspacesByPlan: { plan: string; count: number }[];
	workspacesByType: { type: string; count: number }[];
	transactionsThisMonth: number;
	aiUsageByLayer: {
		layer: number;
		callCount: number;
		totalInputTokens: number;
		totalOutputTokens: number;
	}[];
}

export function getPlatformMetrics(
	accessToken: string
): Promise<Either<ApiError, PlatformMetricsView>> {
	return apiRequest('/admin/metrics', { accessToken });
}

/** Espelha PlanLimits (@finance/shared) e Plan (backend, ports/plan-repository.ts). */
export interface PlanLimitsView {
	maxOwnedSharedWorkspaces: number;
	maxMembersPerWorkspace: number;
	maxSavedFormulasPerWorkspace: number;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix';

/** Espelha PlanPrice (backend, ports/plan-repository.ts) — M5-03: opção de cobrança de um plano. */
export interface PlanPriceView {
	id: string;
	planId: string;
	billingIntervalUnit: 'day' | 'week' | 'month' | 'year';
	billingIntervalCount: number;
	priceCents: number;
	maxInstallments: number;
	paymentMethods: PaymentMethod[];
	isDefault: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface PlanPriceInput {
	billingIntervalUnit: 'day' | 'week' | 'month' | 'year';
	billingIntervalCount: number;
	priceCents: number;
	maxInstallments: number;
	paymentMethods: PaymentMethod[];
	isDefault: boolean;
	sortOrder: number;
}

export interface PlanView {
	id: string;
	key: string;
	name: string;
	description: string | null;
	trialDays: number;
	limits: PlanLimitsView;
	features: string[];
	isActive: boolean;
	sortOrder: number;
	prices: PlanPriceView[];
	createdAt: string;
	updatedAt: string;
}

export interface PlanInput {
	key: string;
	name: string;
	description?: string | null;
	trialDays: number;
	limits: PlanLimitsView;
	features: string[];
}

export function listPlans(accessToken: string): Promise<Either<ApiError, PlanView[]>> {
	return apiRequest('/admin/plans', { accessToken });
}

export function createPlan(
	accessToken: string,
	input: PlanInput
): Promise<Either<ApiError, PlanView>> {
	return apiRequest('/admin/plans', { method: 'POST', body: input, accessToken });
}

export function updatePlan(
	accessToken: string,
	id: string,
	input: Partial<Omit<PlanInput, 'key'>>
): Promise<Either<ApiError, PlanView>> {
	return apiRequest(`/admin/plans/${id}`, { method: 'PATCH', body: input, accessToken });
}

export function deactivatePlan(
	accessToken: string,
	id: string
): Promise<Either<ApiError, PlanView>> {
	return apiRequest(`/admin/plans/${id}/deactivate`, { method: 'POST', accessToken });
}

export function activatePlan(accessToken: string, id: string): Promise<Either<ApiError, PlanView>> {
	return apiRequest(`/admin/plans/${id}/activate`, { method: 'POST', accessToken });
}

export function addPlanPrice(
	accessToken: string,
	planId: string,
	input: PlanPriceInput
): Promise<Either<ApiError, PlanPriceView>> {
	return apiRequest(`/admin/plans/${planId}/prices`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updatePlanPrice(
	accessToken: string,
	planId: string,
	priceId: string,
	input: Partial<PlanPriceInput>
): Promise<Either<ApiError, PlanPriceView>> {
	return apiRequest(`/admin/plans/${planId}/prices/${priceId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function deletePlanPrice(
	accessToken: string,
	planId: string,
	priceId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/admin/plans/${planId}/prices/${priceId}`, {
		method: 'DELETE',
		accessToken
	});
}

/** Espelha AdminWorkspaceView (backend, use-cases/admin/list-workspaces.ts). */
export interface AdminWorkspaceView {
	id: string;
	name: string;
	type: 'personal' | 'family' | 'business';
	plan: PlanView;
	planPrice: PlanPriceView | null;
	trialEndsAt: string | null;
	memberCount: number;
	ownerName: string | null;
	ownerEmail: string | null;
	createdAt: string;
}

export interface ListWorkspacesOutput {
	workspaces: AdminWorkspaceView[];
	total: number;
}

export function listWorkspaces(
	accessToken: string,
	params: { search?: string; limit: number; offset: number }
): Promise<Either<ApiError, ListWorkspacesOutput>> {
	const query = new URLSearchParams();
	if (params.search) query.set('search', params.search);
	query.set('limit', String(params.limit));
	query.set('offset', String(params.offset));
	return apiRequest(`/admin/workspaces?${query}`, { accessToken });
}

export function setWorkspacePlan(
	accessToken: string,
	workspaceId: string,
	planId: string,
	planPriceId?: string
): Promise<Either<ApiError, AdminWorkspaceView>> {
	return apiRequest(`/admin/workspaces/${workspaceId}/plan`, {
		method: 'PATCH',
		body: { planId, planPriceId },
		accessToken
	});
}

export function confirmWorkspacePayment(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, AdminWorkspaceView>> {
	return apiRequest(`/admin/workspaces/${workspaceId}/confirm-payment`, {
		method: 'POST',
		accessToken
	});
}
