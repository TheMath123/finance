import { Elysia } from "elysia";
import { updateWorkspace } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { updateWorkspaceSchema, workspaceParamsSchema } from "../schemas";

export const updateWorkspaceRoute = (deps: AppDeps) =>
  new Elysia().patch("/workspaces/:workspaceId", async ({ request, params, body, set }) => {
    const p = validateParams(workspaceParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
    if (!auth.ok) return fail(set, auth.error);
    const input = validateBody(updateWorkspaceSchema, body);
    if (!input.ok) return fail(set, input.error);
    return updateWorkspace(deps, auth.value, input.value);
  });
