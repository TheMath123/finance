import type { NotificationType } from "@finance/shared";

export interface Notification {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: NotificationType;
  enabled: boolean;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
}
