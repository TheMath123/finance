import { Elysia } from "elysia";
import { verifyEmail } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { validateBody } from "../../../validate";
import { verifyEmailSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";

export const verifyEmailRoute = (deps: AppDeps) =>
  new Elysia().post("/verify-email", async ({ body, set }) => {
    const input = validateBody(verifyEmailSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await verifyEmail(deps, input.value);
    if (!result.ok) return fail(set, AUTH_ERRORS[result.error]);
    return { message: "E-mail verificado." };
  });
