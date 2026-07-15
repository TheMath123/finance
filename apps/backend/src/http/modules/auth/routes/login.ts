import { Elysia } from "elysia";
import { login } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { validateBody } from "../../../validate";
import { loginSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";

export const loginRoute = (deps: AppDeps) =>
  new Elysia().post("/login", async ({ body, set }) => {
    const input = validateBody(loginSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await login(deps, input.value);
    return respond(set, result, AUTH_ERRORS);
  });
