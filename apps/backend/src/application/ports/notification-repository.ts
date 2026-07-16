import type { NotificationType } from "@finance/shared";
import type { Notification } from "../../domain/entities/notification";

export interface CreateNotificationData {
  userId: string;
  workspaceId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationRepository {
  create(data: CreateNotificationData): Promise<Notification>;
  findById(id: string): Promise<Notification | undefined>;
  /** Lista do usuário — `archived: false` (padrão) ou `true` conforme a aba do app. */
  listByUser(userId: string, archived: boolean): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  archive(id: string): Promise<void>;
  unarchive(id: string): Promise<void>;
  /** Evita duplicar notificação de sweep (invoice_closed/due, recurring_pending) já enviada. */
  existsForEntity(userId: string, type: NotificationType, entityKey: string): Promise<boolean>;
}
