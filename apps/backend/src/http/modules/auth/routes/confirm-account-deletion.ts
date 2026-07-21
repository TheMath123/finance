import { Elysia } from "elysia";
import { confirmAccountDeletion } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody } from "../../../validate";
import { AUTH_ERRORS } from "../errors";
import { confirmAccountDeletionSchema } from "../schemas";

export const confirmAccountDeletionRoute = (deps: AppDeps) =>
  new Elysia().post("/me/delete/confirm", async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const input = validateBody(confirmAccountDeletionSchema, body);
    if (!input.ok) return fail(set, input.error);

    const result = await confirmAccountDeletion(deps, {
      userId: auth.value.userId,
      code: input.value.code,
    });
    return respond(set, result, AUTH_ERRORS, 204);
  });
