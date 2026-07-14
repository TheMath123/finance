import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { accountParamsSchema } from "../schemas";
import { ACCOUNT_ERRORS } from "../errors";
import { deleteAccount } from "../services/delete-account";

export const deleteAccountRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/accounts/:accountId",
    async ({ request, params, set }) => {
      const p = parseParams(accountParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteAccount(deps, auth.value, p.value.accountId);
      if (!result.ok) return fail(set, ACCOUNT_ERRORS[result.error]);
      set.status = 204;
    },
  );
