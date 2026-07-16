import { Elysia } from "elysia";
import { listWorkspaceInvites } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { workspaceParamsSchema } from "../schemas";

export const listWorkspaceInvitesRoute = (deps: AppDeps) =>
  new Elysia().get("/workspaces/:workspaceId/invites", async ({ request, params, set }) => {
    const p = validateParams(workspaceParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
    if (!auth.ok) return fail(set, auth.error);
    return listWorkspaceInvites(deps, auth.value);
  });
