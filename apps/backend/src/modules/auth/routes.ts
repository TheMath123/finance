import { Elysia } from "elysia";
import type { ZodType } from "zod";
import { isRateLimited } from "../../lib/rate-limit";
import * as authService from "./service";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./schemas";
import type { AuthDeps, AuthError } from "./service";

const ERROR_STATUS: Record<AuthError, number> = {
  email_taken: 409,
  invalid_credentials: 401,
  invalid_token: 401,
};

const ERROR_MESSAGE: Record<AuthError, string> = {
  email_taken: "E-mail já cadastrado.",
  invalid_credentials: "E-mail ou senha inválidos.",
  invalid_token: "Token inválido ou expirado.",
};

function parse<T>(schema: ZodType<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (result.success) return { data: result.data, error: null };
  return {
    data: null,
    error: {
      code: "validation_error",
      message: "Payload inválido.",
      issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    },
  };
}

/** Limites por rota (janela de 1 minuto), chaveados por IP. */
const RATE_LIMITS: Record<string, number> = {
  "/auth/register": 5,
  "/auth/login": 10,
  "/auth/refresh": 30,
  "/auth/forgot-password": 5,
  "/auth/reset-password": 10,
  "/auth/verify-email": 10,
};

export function authRoutes(deps: AuthDeps) {
  return new Elysia({ prefix: "/auth" })
    .onBeforeHandle(({ request, set, server }) => {
      const path = new URL(request.url).pathname;
      const max = RATE_LIMITS[path];
      if (!max) return;
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        server?.requestIP(request)?.address ??
        "unknown";
      if (isRateLimited(`${ip}:${path}`, max, 60_000)) {
        set.status = 429;
        return { error: { code: "rate_limited", message: "Muitas tentativas. Aguarde." } };
      }
    })
    .post("/register", async ({ body, set }) => {
      const { data, error } = parse(registerSchema, body);
      if (error) return ((set.status = 400), { error });
      const result = await authService.register(deps, data);
      if (!result.ok) {
        set.status = ERROR_STATUS[result.error];
        return { error: { code: result.error, message: ERROR_MESSAGE[result.error] } };
      }
      set.status = 201;
      return result.value;
    })
    .post("/login", async ({ body, set }) => {
      const { data, error } = parse(loginSchema, body);
      if (error) return ((set.status = 400), { error });
      const result = await authService.login(deps, data);
      if (!result.ok) {
        set.status = ERROR_STATUS[result.error];
        return { error: { code: result.error, message: ERROR_MESSAGE[result.error] } };
      }
      return result.value;
    })
    .post("/refresh", async ({ body, set }) => {
      const { data, error } = parse(refreshSchema, body);
      if (error) return ((set.status = 400), { error });
      const result = await authService.refresh(deps, data);
      if (!result.ok) {
        set.status = ERROR_STATUS[result.error];
        return { error: { code: result.error, message: ERROR_MESSAGE[result.error] } };
      }
      return result.value;
    })
    .post("/logout", async ({ body, set }) => {
      const { data, error } = parse(refreshSchema, body);
      if (error) return ((set.status = 400), { error });
      await authService.logout(deps, data);
      set.status = 204;
    })
    .post("/forgot-password", async ({ body, set }) => {
      const { data, error } = parse(forgotPasswordSchema, body);
      if (error) return ((set.status = 400), { error });
      await authService.forgotPassword(deps, data);
      // Resposta sempre genérica (OWASP): não revela se o e-mail existe
      return { message: "Se o e-mail existir, enviaremos as instruções de recuperação." };
    })
    .post("/reset-password", async ({ body, set }) => {
      const { data, error } = parse(resetPasswordSchema, body);
      if (error) return ((set.status = 400), { error });
      const result = await authService.resetPassword(deps, data);
      if (!result.ok) {
        set.status = ERROR_STATUS[result.error];
        return { error: { code: result.error, message: ERROR_MESSAGE[result.error] } };
      }
      return { message: "Senha redefinida. Faça login com a nova senha." };
    })
    .post("/verify-email", async ({ body, set }) => {
      const { data, error } = parse(verifyEmailSchema, body);
      if (error) return ((set.status = 400), { error });
      const result = await authService.verifyEmail(deps, data);
      if (!result.ok) {
        set.status = ERROR_STATUS[result.error];
        return { error: { code: result.error, message: ERROR_MESSAGE[result.error] } };
      }
      return { message: "E-mail verificado." };
    });
}
