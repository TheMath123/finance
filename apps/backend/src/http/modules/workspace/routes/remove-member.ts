import { Elysia } from "elysia";
import { removeMember } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { memberParamsSchema } from "../schemas";
import { WORKSPACE_ERRORS } from "../errors";

/** minRole "viewer" (= só precisa ser membro) — permite sair do workspace; remover outro exige admin/owner, checado dentro do use case. */
export const removeMemberRoute = (deps: AppDeps) =>
  new Elysia().delete("/workspaces/:workspaceId/members/:userId", async ({ request, params, set }) => {
    const p = validateParams(memberParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "viewer");
    if (!auth.ok) return fail(set, auth.error);
    const result = await removeMember(deps, auth.value, p.value.userId);
    return respond(set, result, WORKSPACE_ERRORS, 204);
  });
