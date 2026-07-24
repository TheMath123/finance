import type { NotificationType } from '@finance/shared';

import { apiRequest } from '@/lib/api-client';

export interface NotificationView {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface NotificationPreferenceView {
  type: NotificationType;
  enabled: boolean;
}

export const notificationApi = {
  list: (archived: boolean) =>
    apiRequest<NotificationView[]>(`/notifications?archived=${archived}`),

  markRead: (id: string) =>
    apiRequest<void>(`/notifications/${id}/read`, { method: 'POST' }),

  archive: (id: string) =>
    apiRequest<void>(`/notifications/${id}/archive`, { method: 'POST' }),

  unarchive: (id: string) =>
    apiRequest<void>(`/notifications/${id}/unarchive`, { method: 'POST' }),

  listPreferences: () =>
    apiRequest<NotificationPreferenceView[]>('/notification-preferences'),

  updatePreference: (type: NotificationType, enabled: boolean) =>
    apiRequest<NotificationPreferenceView>(
      `/notification-preferences/${type}`,
      {
        method: 'PATCH',
        body: { enabled },
      }
    ),

  registerPushToken: (token: string) =>
    apiRequest<void>('/push-tokens', { method: 'POST', body: { token } }),

  unregisterPushToken: (token: string) =>
    apiRequest<void>('/push-tokens', { method: 'DELETE', body: { token } }),
};
