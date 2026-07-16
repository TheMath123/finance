import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { NotificationError } from "./errors";

export async function markNotificationRead(
  deps: Pick<UseCaseDeps, "repos">,
  userId: string,
  notificationId: string,
): Promise<Either<NotificationError, null>> {
  const notification = await deps.repos.notification.findById(notificationId);
  if (!notification || notification.userId !== userId) return left("notification_not_found");

  await deps.repos.notification.markRead(notificationId);
  return right(null);
}
