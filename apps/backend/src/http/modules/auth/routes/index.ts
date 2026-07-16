import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { getClientIp } from "../../../client-ip";
import { registerRoute } from "./register";
import { loginRoute } from "./login";
import { refreshRoute } from "./refresh";
import { logoutRoute } from "./logout";
import { forgotPasswordRoute } from "./forgot-password";
import { verifyResetCodeRoute } from "./verify-reset-code";
import { resetPasswordRoute } from "./reset-password";
import { verifyEmailRoute } from "./verify-email";
import { meRoute } from "./me";
import { deleteAccountRoute } from "./delete-account";

/** Limites por IP e por rota (spec: Rate limiting, camada 1) — janela em ms varia por rota. */
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/auth/register": { max: 5, windowMs: 3_600_000 },
  "/auth/login": { max: 10, windowMs: 60_000 },
  "/auth/refresh": { max: 30, windowMs: 60_000 },
  "/auth/forgot-password": { max: 5, windowMs: 3_600_000 },
  "/auth/verify-reset-code": { max: 10, windowMs: 60_000 },
  "/auth/reset-password": { max: 10, windowMs: 60_000 },
  "/auth/verify-email": { max: 10, windowMs: 60_000 },
};

export function authRoutes(deps: AppDeps) {
  return new Elysia({ prefix: "/auth" })
    .onBeforeHandle(async ({ request, set, server }) => {
      const path = new URL(request.url).pathname;
      const limit = RATE_LIMITS[path];
      if (!limit) return;
      const ip = getClientIp(request, server, deps.trustProxy);
      if (await deps.rateLimiter.isLimited(`ip:${ip}:${path}`, limit.max, limit.windowMs)) {
        deps.logger.log("rate_limited", { scopeKey: "ip", path });
        set.status = 429;
        set.headers["retry-after"] = String(Math.ceil(limit.windowMs / 1000));
        return { error: { code: "rate_limited", message: "Muitas tentativas. Aguarde." } };
      }
    })
    .use(registerRoute(deps))
    .use(loginRoute(deps))
    .use(refreshRoute(deps))
    .use(logoutRoute(deps))
    .use(forgotPasswordRoute(deps))
    .use(verifyResetCodeRoute(deps))
    .use(resetPasswordRoute(deps))
    .use(verifyEmailRoute(deps))
    .use(meRoute(deps))
    .use(deleteAccountRoute(deps));
}
