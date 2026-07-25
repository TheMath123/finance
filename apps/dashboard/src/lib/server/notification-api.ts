import type { Either, NotificationType } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha Notification (backend, domain/entities/notification.ts — datas serializadas). */
export interface NotificationView {
	id: string;
	workspaceId: string | null;
	type: NotificationType;
	title: string;
	body: string;
	data: Record<string, unknown> | null;
	readAt: string | null;
	archivedAt: string | null;
	createdAt: string;
}

/** Espelha NotificationPreference (backend, domain/entities/notification.ts). */
export interface NotificationPreferenceView {
	id: string;
	type: NotificationType;
	enabled: boolean;
}

export function listNotifications(
	accessToken: string,
	archived = false
): Promise<Either<ApiError, NotificationView[]>> {
	// z.coerce.boolean() no backend trata qualquer string não-vazia como true —
	// então "archived=false" nunca pode ser enviado (mesma regra de transaction-api).
	return apiRequest(`/notifications${archived ? '?archived=true' : ''}`, { accessToken });
}

export function markNotificationRead(
	accessToken: string,
	notificationId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/notifications/${notificationId}/read`, { method: 'POST', accessToken });
}

export function archiveNotification(
	accessToken: string,
	notificationId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/notifications/${notificationId}/archive`, { method: 'POST', accessToken });
}

export function unarchiveNotification(
	accessToken: string,
	notificationId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/notifications/${notificationId}/unarchive`, { method: 'POST', accessToken });
}

export function listNotificationPreferences(
	accessToken: string
): Promise<Either<ApiError, NotificationPreferenceView[]>> {
	return apiRequest('/notification-preferences', { accessToken });
}

export function updateNotificationPreference(
	accessToken: string,
	type: NotificationType,
	enabled: boolean
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/notification-preferences/${type}`, {
		method: 'PATCH',
		body: { enabled },
		accessToken
	});
}
