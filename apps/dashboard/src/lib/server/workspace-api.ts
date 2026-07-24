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

/** Espelha WorkspaceMemberView (backend, ports/workspace-repository.ts). */
export interface WorkspaceMemberView {
	userId: string;
	role: 'owner' | 'admin' | 'member' | 'viewer';
	name: string;
	email: string;
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
