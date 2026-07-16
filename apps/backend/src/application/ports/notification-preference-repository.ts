import type { NotificationType } from "@finance/shared";
import type { NotificationPreference } from "../../domain/entities/notification";

export interface NotificationPreferenceRepository {
  listByUser(userId: string): Promise<NotificationPreference[]>;
  /** Ausência de linha = habilitado (default) — checado antes de criar/enviar push. */
  isEnabled(userId: string, type: NotificationType): Promise<boolean>;
  upsert(userId: string, type: NotificationType, enabled: boolean): Promise<NotificationPreference>;
}
