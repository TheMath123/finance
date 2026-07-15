import { Elysia } from "elysia";
import { deleteAccount } from "../../../../application/use-cases/account";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { accountParamsSchema } from "../schemas";
import { ACCOUNT_ERRORS } from "../errors";

export const deleteAccountRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/accounts/:accountId",
    async ({ request, params, set }) => {
      const p = validateParams(accountParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteAccount(deps, auth.value, p.value.accountId);
      return respond(set, result, ACCOUNT_ERRORS, 204);
    },
  );
