import { Elysia } from "elysia";
import { archiveAccount } from "../../../../application/use-cases/account";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { accountParamsSchema } from "../schemas";
import { ACCOUNT_ERRORS } from "../errors";

export const archiveAccountRoute = (deps: AppDeps) =>
  new Elysia()
    .post(
      "/workspaces/:workspaceId/accounts/:accountId/archive",
      async ({ request, params, set }) => {
        const p = validateParams(accountParamsSchema, params);
        if (!p.ok) return fail(set, p.error);
        const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
        if (!auth.ok) return fail(set, auth.error);
        const result = await archiveAccount(deps, auth.value, p.value.accountId, true);
        return respond(set, result, ACCOUNT_ERRORS);
      },
    )
    .post(
      "/workspaces/:workspaceId/accounts/:accountId/unarchive",
      async ({ request, params, set }) => {
        const p = validateParams(accountParamsSchema, params);
        if (!p.ok) return fail(set, p.error);
        const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
        if (!auth.ok) return fail(set, auth.error);
        const result = await archiveAccount(deps, auth.value, p.value.accountId, false);
        return respond(set, result, ACCOUNT_ERRORS);
      },
    );
