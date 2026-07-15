import { Elysia } from "elysia";
import { register } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { validateBody } from "../../../validate";
import { registerSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";

export const registerRoute = (deps: AppDeps) =>
  new Elysia().post("/register", async ({ body, set }) => {
    const input = validateBody(registerSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await register(deps, input.value);
    return respond(set, result, AUTH_ERRORS, 201);
  });
