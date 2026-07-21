import { Elysia } from "elysia";
import { requestAccountDeletion } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody } from "../../../validate";
import { AUTH_ERRORS } from "../errors";
import { requestAccountDeletionSchema } from "../schemas";

export const requestAccountDeletionRoute = (deps: AppDeps) =>
  new Elysia().post("/me/delete/request", async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const input = validateBody(requestAccountDeletionSchema, body);
    if (!input.ok) return fail(set, input.error);

    // userId sempre do JWT — nunca de um campo do body.
    const result = await requestAccountDeletion(deps, {
      userId: auth.value.userId,
      password: input.value.password,
    });
    return respond(set, result, AUTH_ERRORS, 204);
  });
