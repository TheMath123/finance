import { Elysia } from "elysia";
import { me } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { AUTH_ERRORS } from "../errors";

export const meRoute = (deps: AppDeps) =>
  new Elysia().get("/me", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const result = await me(deps, auth.value.userId);
    return respond(set, result, AUTH_ERRORS);
  });
