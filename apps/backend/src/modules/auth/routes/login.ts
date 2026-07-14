import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse } from "../../../lib/http";
import { loginSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";
import { login } from "../services/login";

export const loginRoute = (deps: AppDeps) =>
  new Elysia().post("/login", async ({ body, set }) => {
    const input = parse(loginSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await login(deps, input.value);
    if (!result.ok) return fail(set, AUTH_ERRORS[result.error]);
    return result.value;
  });
