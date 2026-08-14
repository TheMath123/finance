import type { Either, PlatformRole } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha o AuthSession do backend (application/use-cases/auth/session.ts). */
export interface SessionUser {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	emailVerifiedAt: string | null;
	pendingEmail: string | null;
	platformRole: PlatformRole;
}

export interface AuthSession {
	user: SessionUser;
	defaultWorkspaceId: string;
	accessToken: string;
	refreshToken: string;
}

export function login(input: {
	email: string;
	password: string;
}): Promise<Either<ApiError, AuthSession>> {
	return apiRequest('/auth/login', { method: 'POST', body: input });
}

export function register(input: {
	name: string;
	email: string;
	password: string;
	termsAccepted: true;
}): Promise<Either<ApiError, AuthSession>> {
	return apiRequest('/auth/register', { method: 'POST', body: input });
}

export function googleSignIn(input: {
	idToken: string;
	termsAccepted: true;
}): Promise<Either<ApiError, AuthSession>> {
	return apiRequest('/auth/google', { method: 'POST', body: input });
}

export function refresh(refreshToken: string): Promise<Either<ApiError, AuthSession>> {
	return apiRequest('/auth/refresh', { method: 'POST', body: { refreshToken } });
}

export function logout(refreshToken: string): Promise<Either<ApiError, void>> {
	return apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } });
}

/** Espelha o MeOutput do backend (application/use-cases/auth/me.ts). */
export interface MeOutput {
	user: SessionUser;
	defaultWorkspaceId: string;
	featureFlags: Record<string, boolean>;
}

export function me(accessToken: string): Promise<Either<ApiError, MeOutput>> {
	return apiRequest('/auth/me', { accessToken });
}

export function updateName(accessToken: string, name: string): Promise<Either<ApiError, unknown>> {
	return apiRequest('/auth/me', { method: 'PATCH', body: { name }, accessToken });
}

export function changePassword(
	accessToken: string,
	input: { currentPassword: string; newPassword: string; currentRefreshToken?: string }
): Promise<Either<ApiError, unknown>> {
	return apiRequest('/auth/me/password', { method: 'POST', body: input, accessToken });
}

export function requestEmailChange(
	accessToken: string,
	input: { newEmail: string; currentPassword: string }
): Promise<Either<ApiError, unknown>> {
	return apiRequest('/auth/me/email/request-change', { method: 'POST', body: input, accessToken });
}

export function confirmEmailChange(
	accessToken: string,
	code: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest('/auth/me/email/confirm-change', {
		method: 'POST',
		body: { code },
		accessToken
	});
}

export function requestAccountDeletion(
	accessToken: string,
	password: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest('/auth/me/delete/request', { method: 'POST', body: { password }, accessToken });
}

export function confirmAccountDeletion(
	accessToken: string,
	code: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest('/auth/me/delete/confirm', { method: 'POST', body: { code }, accessToken });
}

export function verifyEmail(input: {
	token: string;
}): Promise<Either<ApiError, { message: string }>> {
	return apiRequest('/auth/verify-email', { method: 'POST', body: input });
}

export function forgotPassword(input: {
	email: string;
}): Promise<Either<ApiError, { message: string }>> {
	return apiRequest('/auth/forgot-password', { method: 'POST', body: input });
}

export function verifyResetCode(input: {
	email: string;
	code: string;
}): Promise<Either<ApiError, { message: string }>> {
	return apiRequest('/auth/verify-reset-code', { method: 'POST', body: input });
}

export function resetPassword(input: {
	email: string;
	code: string;
	password: string;
}): Promise<Either<ApiError, { message: string }>> {
	return apiRequest('/auth/reset-password', { method: 'POST', body: input });
}
