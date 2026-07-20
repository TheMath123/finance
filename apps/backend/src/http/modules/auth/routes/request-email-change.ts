import { Elysia } from "elysia";
import { requestEmailChange } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody } from "../../../validate";
import { AUTH_ERRORS } from "../errors";
import { requestEmailChangeSchema } from "../schemas";

export const requestEmailChangeRoute = (deps: AppDeps) =>
  new Elysia().post("/me/email/request-change", async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const input = validateBody(requestEmailChangeSchema, body);
    if (!input.ok) return fail(set, input.error);

    // userId sempre do JWT — nunca de um campo do body.
    const result = await requestEmailChange(deps, {
      userId: auth.value.userId,
      newEmail: input.value.newEmail,
      currentPassword: input.value.currentPassword,
    });
    return respond(set, result, AUTH_ERRORS);
  });
