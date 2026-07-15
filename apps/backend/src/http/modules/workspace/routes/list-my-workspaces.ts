import { Elysia } from "elysia";
import { listMyWorkspaces } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";

export const listMyWorkspacesRoute = (deps: AppDeps) =>
  new Elysia().get("/workspaces", async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listMyWorkspaces(deps, auth.value.userId);
  });
