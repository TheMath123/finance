import { Elysia } from "elysia";
import { updateAccount } from "../../../../application/use-cases/account";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { accountParamsSchema, updateAccountSchema } from "../schemas";
import { ACCOUNT_ERRORS } from "../errors";

export const updateAccountRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/accounts/:accountId",
    async ({ request, params, body, set }) => {
      const p = validateParams(accountParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateAccountSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateAccount(deps, auth.value, p.value.accountId, input.value);
      return respond(set, result, ACCOUNT_ERRORS);
    },
  );
