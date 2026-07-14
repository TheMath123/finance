import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse } from "../../../lib/http";
import { resetPasswordSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";
import { resetPassword } from "../services/reset-password";

export const resetPasswordRoute = (deps: AppDeps) =>
  new Elysia().post("/reset-password", async ({ body, set }) => {
    const input = parse(resetPasswordSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await resetPassword(deps, input.value);
    if (!result.ok) return fail(set, AUTH_ERRORS[result.error]);
    return { message: "Senha redefinida. Faça login com a nova senha." };
  });
