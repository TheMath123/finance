import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha WorkspaceSummary (backend, use-cases/workspace/list-my-workspaces.ts). */
export interface WorkspaceSummary {
	id: string;
	name: string;
	type: string;
	plan: string;
	role: string;
}

/** Espelha WorkspaceMemberSummary (backend, use-cases/workspace/list-members.ts). */
export interface WorkspaceMemberView {
	userId: string;
	role: 'owner' | 'admin' | 'member' | 'viewer';
	name: string;
	email: string;
	avatarUrl: string | null;
}

/** Espelha WorkspaceInvite (backend, domain/entities/workspace.ts — datas serializadas). */
export interface WorkspaceInviteView {
	id: string;
	workspaceId: string;
	invitedBy: string | null;
	emailOrPhone: string;
	role: 'admin' | 'member' | 'viewer';
	status: string;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
}

/** Espelha MyInviteView (backend, use-cases/workspace/list-my-invites.ts). */
export interface MyInviteView {
	id: string;
	workspaceId: string;
	workspaceName: string;
	inviterName: string;
	role: 'admin' | 'member' | 'viewer';
	expiresAt: string;
}

/** Espelha AuditLogView (backend, ports/audit-recorder.ts — datas serializadas). */
export interface AuditLogView {
	id: string;
	action: string;
	entity: string;
	entityId: string;
	createdAt: string;
	userId: string | null;
	userName: string | null;
}

export function listMyWorkspaces(
	accessToken: string
): Promise<Either<ApiError, WorkspaceSummary[]>> {
	return apiRequest('/workspaces', { accessToken });
}

export function createWorkspace(
	accessToken: string,
	input: { name: string }
): Promise<Either<ApiError, WorkspaceSummary>> {
	return apiRequest('/workspaces', { method: 'POST', body: input, accessToken });
}

export function updateWorkspace(
	accessToken: string,
	workspaceId: string,
	input: { name: string }
): Promise<Either<ApiError, WorkspaceSummary>> {
	return apiRequest(`/workspaces/${workspaceId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function listMembers(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, WorkspaceMemberView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/members`, { accessToken });
}

export function updateMemberRole(
	accessToken: string,
	workspaceId: string,
	userId: string,
	role: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/members/${userId}`, {
		method: 'PATCH',
		body: { role },
		accessToken
	});
}

export function removeMember(
	accessToken: string,
	workspaceId: string,
	userId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/members/${userId}`, {
		method: 'DELETE',
		accessToken
	});
}

export function listWorkspaceInvites(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, WorkspaceInviteView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/invites`, { accessToken });
}

export function createInvite(
	accessToken: string,
	workspaceId: string,
	input: { emailOrPhone: string; role: string }
): Promise<Either<ApiError, WorkspaceInviteView>> {
	return apiRequest(`/workspaces/${workspaceId}/invites`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function revokeInvite(
	accessToken: string,
	inviteId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/invites/${inviteId}/revoke`, {
		method: 'POST',
		accessToken
	});
}

export function listMyInvites(accessToken: string): Promise<Either<ApiError, MyInviteView[]>> {
	return apiRequest('/invites', { accessToken });
}

export function acceptInvite(
	accessToken: string,
	inviteId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/invites/${inviteId}/accept`, {
		method: 'POST',
		accessToken
	});
}

export function listActivity(
	accessToken: string,
	workspaceId: string,
	filters: { limit?: number; offset?: number } = {}
): Promise<Either<ApiError, AuditLogView[]>> {
	const query = new URLSearchParams();
	if (filters.limit) query.set('limit', String(filters.limit));
	if (filters.offset) query.set('offset', String(filters.offset));
	const suffix = query.size > 0 ? `?${query}` : '';
	return apiRequest(`/workspaces/${workspaceId}/activity${suffix}`, {
		accessToken
	});
}

/** M5-05 — autoatendimento (M5-04): assinar/gerenciar plano via Stripe Checkout/Customer Portal. */
export interface PlanLimitsView {
	maxOwnedSharedWorkspaces: number;
	maxMembersPerWorkspace: number;
	maxSavedFormulasPerWorkspace: number;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix';

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

export type SubscriptionStatus =
	'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

export interface BillingStatusView {
	plan: PlanView;
	planPrice: PlanPriceView | null;
	subscriptionStatus: SubscriptionStatus;
	trialEndsAt: string | null;
	cancelAtPeriodEnd: boolean;
	currentPeriodEndsAt: string | null;
	hasStripeCustomer: boolean;
}

export function listAvailablePlans(accessToken: string): Promise<Either<ApiError, PlanView[]>> {
	return apiRequest('/plans', { accessToken });
}

export function getBillingStatus(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, BillingStatusView>> {
	return apiRequest(`/workspaces/${workspaceId}/billing`, { accessToken });
}

export function startCheckout(
	accessToken: string,
	workspaceId: string,
	input: { planId: string; planPriceId: string; successUrl: string; cancelUrl: string }
): Promise<Either<ApiError, { checkoutUrl: string }>> {
	return apiRequest(`/workspaces/${workspaceId}/billing/checkout`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function startBillingPortal(
	accessToken: string,
	workspaceId: string,
	returnUrl: string
): Promise<Either<ApiError, { portalUrl: string }>> {
	return apiRequest(`/workspaces/${workspaceId}/billing/portal`, {
		method: 'POST',
		body: { returnUrl },
		accessToken
	});
}
