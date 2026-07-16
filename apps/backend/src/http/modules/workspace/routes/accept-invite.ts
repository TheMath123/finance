import { Elysia } from "elysia";
import { acceptInvite } from "../../../../application/use-cases/workspace";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireAuthenticated } from "../../../guards";
import { validateParams } from "../../../validate";
import { inviteParamsSchema } from "../schemas";
import { WORKSPACE_ERRORS } from "../errors";

export const acceptInviteRoute = (deps: AppDeps) =>
  new Elysia().post("/invites/:inviteId/accept", async ({ request, params, set }) => {
    const p = validateParams(inviteParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const result = await acceptInvite(deps, auth.value.userId, p.value.inviteId);
    return respond(set, result, WORKSPACE_ERRORS, 204);
  });
