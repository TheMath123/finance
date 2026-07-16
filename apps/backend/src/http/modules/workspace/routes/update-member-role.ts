import { Elysia } from "elysia";
import { updateMemberRole } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { memberParamsSchema, updateMemberRoleSchema } from "../schemas";
import { WORKSPACE_ERRORS } from "../errors";

export const updateMemberRoleRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/members/:userId",
    async ({ request, params, body, set }) => {
      const p = validateParams(memberParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateMemberRoleSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateMemberRole(deps, auth.value, {
        userId: p.value.userId,
        role: input.value.role,
      });
      return respond(set, result, WORKSPACE_ERRORS, 204);
    },
  );
