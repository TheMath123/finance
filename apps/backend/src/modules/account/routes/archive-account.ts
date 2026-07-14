import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { accountParamsSchema } from "../schemas";
import { ACCOUNT_ERRORS } from "../errors";
import { archiveAccount } from "../services/archive-account";

export const archiveAccountRoute = (deps: AppDeps) =>
  new Elysia()
    .post(
      "/workspaces/:workspaceId/accounts/:accountId/archive",
      async ({ request, params, set }) => {
        const p = parseParams(accountParamsSchema, params);
        if (!p.ok) return fail(set, p.error);
        const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
        if (!auth.ok) return fail(set, auth.error);
        const result = await archiveAccount(deps, auth.value, p.value.accountId, true);
        if (!result.ok) return fail(set, ACCOUNT_ERRORS[result.error]);
        return result.value;
      },
    )
    .post(
      "/workspaces/:workspaceId/accounts/:accountId/unarchive",
      async ({ request, params, set }) => {
        const p = parseParams(accountParamsSchema, params);
        if (!p.ok) return fail(set, p.error);
        const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
        if (!auth.ok) return fail(set, auth.error);
        const result = await archiveAccount(deps, auth.value, p.value.accountId, false);
        if (!result.ok) return fail(set, ACCOUNT_ERRORS[result.error]);
        return result.value;
      },
    );
