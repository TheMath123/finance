import { Elysia } from "elysia";
import { createInvite } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { createInviteSchema, workspaceParamsSchema } from "../schemas";
import { WORKSPACE_ERRORS } from "../errors";

export const createInviteRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/invites",
    async ({ request, params, body, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(createInviteSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createInvite(deps, auth.value, input.value);
      return respond(set, result, WORKSPACE_ERRORS, 201);
    },
  );
