import { Elysia } from "elysia";
import { verifyResetCode } from "../../../../application/use-cases/auth";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { validateBody } from "../../../validate";
import { verifyResetCodeSchema } from "../schemas";
import { AUTH_ERRORS } from "../errors";

export const verifyResetCodeRoute = (deps: AppDeps) =>
  new Elysia().post("/verify-reset-code", async ({ body, set }) => {
    const input = validateBody(verifyResetCodeSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await verifyResetCode(deps, input.value);
    if (!result.ok) return fail(set, AUTH_ERRORS[result.error]);
    return { message: "Código válido." };
  });
