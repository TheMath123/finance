import { Elysia } from "elysia";
import type { AppDeps } from "../../../deps";
import { listMyWorkspacesRoute } from "./list-my-workspaces";

export function workspaceRoutes(deps: AppDeps) {
  return new Elysia().use(listMyWorkspacesRoute(deps));
}
