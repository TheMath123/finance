import { Elysia } from "elysia";
import { registerPushToken, unregisterPushToken } from "../../../../application/use-cases/notification";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody } from "../../../validate";
import { registerPushTokenSchema, unregisterPushTokenSchema } from "../schemas";

export const registerPushTokenRoute = (deps: AppDeps) =>
  new Elysia().post("/push-tokens", async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const input = validateBody(registerPushTokenSchema, body);
    if (!input.ok) return fail(set, input.error);
    await registerPushToken(deps, auth.value.userId, input.value.token);
    set.status = 204;
  });

export const unregisterPushTokenRoute = (deps: AppDeps) =>
  new Elysia().delete("/push-tokens", async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const input = validateBody(unregisterPushTokenSchema, body);
    if (!input.ok) return fail(set, input.error);
    await unregisterPushToken(deps, auth.value.userId, input.value.token);
    set.status = 204;
  });
