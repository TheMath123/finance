import type { NotificationType } from "@finance/shared";
import type { Notification } from "../../../domain/entities/notification";
import type { UseCaseDeps } from "../../deps";

export interface CreateNotificationInput {
  userId: string;
  workspaceId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Helper interno (não é rota HTTP — chamado por outros use cases: convite,
 * sweep de fatura/recorrência). Preferência desabilitada = não cria nada,
 * nem em app nem push (spec: "desativar por tipo" é tudo ou nada).
 */
export async function createNotification(
  deps: Pick<UseCaseDeps, "repos" | "dispatch">,
  input: CreateNotificationInput,
): Promise<Notification | null> {
  const enabled = await deps.repos.notificationPreference.isEnabled(input.userId, input.type);
  if (!enabled) return null;

  const notification = await deps.repos.notification.create(input);

  const tokens = await deps.repos.pushToken.listByUser(input.userId);
  if (tokens.length > 0) {
    await deps.dispatch("push.send", {
      tokens,
      title: input.title,
      body: input.body,
      data: input.data,
    });
  }

  return notification;
}
