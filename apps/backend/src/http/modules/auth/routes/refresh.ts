import { Elysia } from "elysia";
import { refresh } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { validateBody } from "../../../validate";
import { refreshSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";

export const refreshRoute = (deps: AppDeps) =>
  new Elysia().post("/refresh", async ({ body, set }) => {
    const input = validateBody(refreshSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await refresh(deps, input.value);
    return respond(set, result, AUTH_ERRORS);
  });
