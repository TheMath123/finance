import { Elysia } from "elysia";
import { markNotificationRead } from "../../../../application/use-cases/notification";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateParams } from "../../../validate";
import { notificationParamsSchema } from "../schemas";
import { NOTIFICATION_ERRORS } from "../errors";

export const markNotificationReadRoute = (deps: AppDeps) =>
  new Elysia().post("/notifications/:notificationId/read", async ({ request, params, set }) => {
    const p = validateParams(notificationParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const result = await markNotificationRead(deps, auth.value.userId, p.value.notificationId);
    return respond(set, result, NOTIFICATION_ERRORS, 204);
  });
