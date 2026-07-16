import { NOTIFICATION_TYPES, type NotificationType } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";

export interface NotificationPreferenceView {
  type: NotificationType;
  enabled: boolean;
}

/** Sempre devolve todos os tipos (ausência de linha = habilitado) — a tela de configurações lista tudo de uma vez. */
export async function listNotificationPreferences(
  deps: Pick<UseCaseDeps, "repos">,
  userId: string,
): Promise<NotificationPreferenceView[]> {
  const rows = await deps.repos.notificationPreference.listByUser(userId);
  const byType = new Map(rows.map((r) => [r.type, r.enabled]));
  return NOTIFICATION_TYPES.map((type) => ({ type, enabled: byType.get(type) ?? true }));
}

export async function updateNotificationPreference(
  deps: Pick<UseCaseDeps, "repos">,
  userId: string,
  type: NotificationType,
  enabled: boolean,
): Promise<NotificationPreferenceView> {
  await deps.repos.notificationPreference.upsert(userId, type, enabled);
  return { type, enabled };
}
