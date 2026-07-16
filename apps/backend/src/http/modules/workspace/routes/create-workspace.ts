import { Elysia } from "elysia";
import { createWorkspace } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateBody } from "../../../validate";
import { createWorkspaceSchema } from "../schemas";

export const createWorkspaceRoute = (deps: AppDeps) =>
  new Elysia().post("/workspaces", async ({ request, body, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const input = validateBody(createWorkspaceSchema, body);
    if (!input.ok) return fail(set, input.error);
    const workspace = await createWorkspace(deps, auth.value.userId, input.value);
    set.status = 201;
    return workspace;
  });
