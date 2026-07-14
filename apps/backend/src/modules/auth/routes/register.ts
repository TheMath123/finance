import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse } from "../../../lib/http";
import { registerSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";
import { register } from "../services/register";

export const registerRoute = (deps: AppDeps) =>
  new Elysia().post("/register", async ({ body, set }) => {
    const input = parse(registerSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await register(deps, input.value);
    if (!result.ok) return fail(set, AUTH_ERRORS[result.error]);
    set.status = 201;
    return result.value;
  });
