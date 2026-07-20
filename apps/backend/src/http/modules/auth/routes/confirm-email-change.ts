import { Elysia } from "elysia";
import { confirmEmailChange } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody } from "../../../validate";
import { AUTH_ERRORS } from "../errors";
import { confirmEmailChangeSchema } from "../schemas";

export const confirmEmailChangeRoute = (deps: AppDeps) =>
  new Elysia().post("/me/email/confirm-change", async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const input = validateBody(confirmEmailChangeSchema, body);
    if (!input.ok) return fail(set, input.error);

    // userId sempre do JWT — nunca de um campo do body.
    const result = await confirmEmailChange(deps, { userId: auth.value.userId, code: input.value.code });
    return respond(set, result, AUTH_ERRORS);
  });
