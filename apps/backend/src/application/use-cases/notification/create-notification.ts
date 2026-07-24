import type { NotificationType } from '@finance/shared';
import type { Notification } from '../../../domain/entities/notification';
import type { UseCaseDeps } from '../../deps';

export interface CreateNotificationInput {
  userId: string;
  workspaceId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Tipos com ação rápida direto na notificação (ver `push-notifications.ts` no
 * app, `Notifications.setNotificationCategoryAsync`) — o restante chega só
 * informativo (toque abre o app no destino de sempre). `categoryId` == o
 * próprio tipo por simplicidade; só existe pros 3 que têm ação sem input
 * extra (recusar transferência, marcar/confirmar split).
 */
const ACTIONABLE_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  'transfer_pending',
  'split_payment_pending',
  'split_payment_paid',
]);

/**
 * Helper interno (não é rota HTTP — chamado por outros use cases: convite,
 * sweep de fatura/recorrência). Preferência desabilitada = não cria nada,
 * nem em app nem push (spec: "desativar por tipo" é tudo ou nada).
 */
export async function createNotification(
  deps: Pick<UseCaseDeps, 'repos' | 'dispatch' | 'notificationBus'>,
  input: CreateNotificationInput
): Promise<Notification | null> {
  const enabled = await deps.repos.notificationPreference.isEnabled(
    input.userId,
    input.type
  );
  if (!enabled) return null;

  const notification = await deps.repos.notification.create(input);

  await deps.notificationBus.publish(input.userId, {
    id: notification.id,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data,
    createdAt: notification.createdAt.toISOString(),
  });

  const tokens = await deps.repos.pushToken.listByUser(input.userId);
  if (tokens.length > 0) {
    await deps.dispatch('push.send', {
      tokens,
      title: input.title,
      body: input.body,
      data: input.data,
      categoryId: ACTIONABLE_NOTIFICATION_TYPES.has(input.type)
        ? input.type
        : undefined,
    });
  }

  return notification;
}
