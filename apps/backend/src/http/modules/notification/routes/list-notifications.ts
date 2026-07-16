import { Elysia } from "elysia";
import { listNotifications } from "../../../../application/use-cases/notification";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateQuery } from "../../../validate";
import { listNotificationsQuerySchema } from "../schemas";

export const listNotificationsRoute = (deps: AppDeps) =>
  new Elysia().get("/notifications", async ({ request, query, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const filters = validateQuery(listNotificationsQuerySchema, query);
    if (!filters.ok) return fail(set, filters.error);
    return listNotifications(deps, auth.value.userId, filters.value.archived ?? false);
  });
