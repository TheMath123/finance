import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse } from "../../../lib/http";
import { refreshSchema } from "../schemas";
import { logout } from "../services/logout";

export const logoutRoute = (deps: AppDeps) =>
  new Elysia().post("/logout", async ({ body, set }) => {
    const input = parse(refreshSchema, body);
    if (!input.ok) return fail(set, input.error);
    await logout(deps, input.value);
    set.status = 204;
  });
