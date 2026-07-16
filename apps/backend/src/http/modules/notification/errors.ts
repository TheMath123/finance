import type { NotificationError } from "../../../application/use-cases/notification";
import type { HttpError } from "../../http-error";

export const NOTIFICATION_ERRORS: Record<NotificationError, HttpError> = {
  notification_not_found: {
    status: 404,
    code: "notification_not_found",
    message: "Notificação não encontrada.",
  },
};
