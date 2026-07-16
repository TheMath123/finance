import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { listNotificationsRoute } from "./list-notifications";
import { markNotificationReadRoute } from "./mark-read";
import { archiveNotificationRoute, unarchiveNotificationRoute } from "./archive-notification";
import { listNotificationPreferencesRoute, updateNotificationPreferenceRoute } from "./preferences";
import { registerPushTokenRoute, unregisterPushTokenRoute } from "./push-tokens";

export function notificationRoutes(deps: AppDeps) {
  return new Elysia()
    .use(listNotificationsRoute(deps))
    .use(markNotificationReadRoute(deps))
    .use(archiveNotificationRoute(deps))
    .use(unarchiveNotificationRoute(deps))
    .use(listNotificationPreferencesRoute(deps))
    .use(updateNotificationPreferenceRoute(deps))
    .use(registerPushTokenRoute(deps))
    .use(unregisterPushTokenRoute(deps));
}
