import { Elysia } from "elysia";
import {
  listNotificationPreferences,
  updateNotificationPreference,
} from "../../../../application/use-cases/notification";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { preferenceParamsSchema, updatePreferenceSchema } from "../schemas";

export const listNotificationPreferencesRoute = (deps: AppDeps) =>
  new Elysia().get("/notification-preferences", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listNotificationPreferences(deps, auth.value.userId);
  });

export const updateNotificationPreferenceRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/notification-preferences/:type",
    async ({ request, params, body, set }) => {
      const p = validateParams(preferenceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireAuthenticated(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updatePreferenceSchema, body);
      if (!input.ok) return fail(set, input.error);
      return updateNotificationPreference(deps, auth.value.userId, p.value.type, input.value.enabled);
    },
  );
