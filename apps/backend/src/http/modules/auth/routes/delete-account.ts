import { Elysia } from "elysia";
import { deleteAccount } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody } from "../../../validate";
import { AUTH_ERRORS } from "../errors";
import { deleteAccountSchema } from "../schemas";

export const deleteAccountRoute = (deps: AppDeps) =>
  new Elysia().delete("/me", async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const input = validateBody(deleteAccountSchema, body);
    if (!input.ok) return fail(set, input.error);

    const result = await deleteAccount(deps, {
      userId: auth.value.userId,
      password: input.value.password,
    });
    return respond(set, result, AUTH_ERRORS, 204);
  });
