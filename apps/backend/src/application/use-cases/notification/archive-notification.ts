import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { NotificationError } from './errors';

export async function archiveNotification(
  deps: Pick<UseCaseDeps, 'repos'>,
  userId: string,
  notificationId: string
): Promise<Either<NotificationError, null>> {
  const notification = await deps.repos.notification.findById(notificationId);
  if (!notification || notification.userId !== userId)
    return left('notification_not_found');

  await deps.repos.notification.archive(notificationId);
  return right(null);
}

export async function unarchiveNotification(
  deps: Pick<UseCaseDeps, 'repos'>,
  userId: string,
  notificationId: string
): Promise<Either<NotificationError, null>> {
  const notification = await deps.repos.notification.findById(notificationId);
  if (!notification || notification.userId !== userId)
    return left('notification_not_found');

  await deps.repos.notification.unarchive(notificationId);
  return right(null);
}
