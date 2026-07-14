import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { listMyWorkspacesRoute } from "./list-my-workspaces";

export function workspaceRoutes(deps: AppDeps) {
  return new Elysia().use(listMyWorkspacesRoute(deps));
}
