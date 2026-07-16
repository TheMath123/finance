import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { getClientIp } from "../../../client-ip";
import { registerRoute } from "./register";
import { loginRoute } from "./login";
import { refreshRoute } from "./refresh";
import { logoutRoute } from "./logout";
import { forgotPasswordRoute } from "./forgot-password";
import { resetPasswordRoute } from "./reset-password";
import { verifyEmailRoute } from "./verify-email";
import { meRoute } from "./me";
import { deleteAccountRoute } from "./delete-account";

/** Limites por IP e por rota, janela de 1 minuto (spec: Rate limiting, camada 1). */
const RATE_LIMITS: Record<string, number> = {
  "/auth/register": 5,
  "/auth/login": 10,
  "/auth/refresh": 30,
  "/auth/forgot-password": 5,
  "/auth/reset-password": 10,
  "/auth/verify-email": 10,
};

export function authRoutes(deps: AppDeps) {
  return new Elysia({ prefix: "/auth" })
    .onBeforeHandle(({ request, set, server }) => {
      const path = new URL(request.url).pathname;
      const max = RATE_LIMITS[path];
      if (!max) return;
      const ip = getClientIp(request, server, deps.trustProxy);
      if (deps.rateLimiter.isLimited(`ip:${ip}:${path}`, max, 60_000)) {
        deps.logger.log("rate_limited", { scopeKey: "ip", path });
        set.status = 429;
        set.headers["retry-after"] = "60";
        return { error: { code: "rate_limited", message: "Muitas tentativas. Aguarde." } };
      }
    })
    .use(registerRoute(deps))
    .use(loginRoute(deps))
    .use(refreshRoute(deps))
    .use(logoutRoute(deps))
    .use(forgotPasswordRoute(deps))
    .use(resetPasswordRoute(deps))
    .use(verifyEmailRoute(deps))
    .use(meRoute(deps))
    .use(deleteAccountRoute(deps));
}
