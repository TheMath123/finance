import type { Notification } from '../../../domain/entities/notification';
import type { UseCaseDeps } from '../../deps';

export function listNotifications(
  deps: Pick<UseCaseDeps, 'repos'>,
  userId: string,
  archived: boolean
): Promise<Notification[]> {
  return deps.repos.notification.listByUser(userId, archived);
}
