import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail } from "../../../lib/http";
import { verifyAccessToken } from "../../../lib/tokens";
import { listMyWorkspaces } from "../services/list-my-workspaces";

export const listMyWorkspacesRoute = (deps: AppDeps) =>
  new Elysia().get("/workspaces", async ({ request, set }) => {
    const header = request.headers.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const payload = token ? await verifyAccessToken(deps.jwtSecret, token) : null;
    if (!payload) {
      return fail(set, { status: 401, code: "unauthorized", message: "Autenticação necessária." });
    }
    return listMyWorkspaces(deps, payload.userId);
  });
