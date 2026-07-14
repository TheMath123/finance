import { Elysia } from "elysia";
import { authRoutes } from "./modules/auth/routes";
import type { AuthDeps } from "./modules/auth/service";

export type AppDeps = AuthDeps;

export function createApp(deps: AppDeps) {
  return new Elysia()
    .get("/health", () => ({ status: "ok" }))
    .use(authRoutes(deps));
}
