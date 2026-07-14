import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse } from "../../../lib/http";
import { forgotPasswordSchema } from "../schemas";
import { forgotPassword } from "../services/forgot-password";

export const forgotPasswordRoute = (deps: AppDeps) =>
  new Elysia().post("/forgot-password", async ({ body, set }) => {
    const input = parse(forgotPasswordSchema, body);
    if (!input.ok) return fail(set, input.error);
    await forgotPassword(deps, input.value);
    // Resposta sempre genérica (OWASP): não revela se o e-mail existe
    return { message: "Se o e-mail existir, enviaremos as instruções de recuperação." };
  });
