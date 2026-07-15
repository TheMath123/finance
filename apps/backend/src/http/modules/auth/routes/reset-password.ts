import { Elysia } from "elysia";
import { resetPassword } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { validateBody } from "../../../validate";
import { resetPasswordSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";

export const resetPasswordRoute = (deps: AppDeps) =>
  new Elysia().post("/reset-password", async ({ body, set }) => {
    const input = validateBody(resetPasswordSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await resetPassword(deps, input.value);
    if (!result.ok) return fail(set, AUTH_ERRORS[result.error]);
    return { message: "Senha redefinida. Faça login com a nova senha." };
  });
