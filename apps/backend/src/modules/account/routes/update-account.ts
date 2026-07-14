import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { accountParamsSchema, updateAccountSchema } from "../schemas";
import { ACCOUNT_ERRORS } from "../errors";
import { updateAccount } from "../services/update-account";

export const updateAccountRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/accounts/:accountId",
    async ({ request, params, body, set }) => {
      const p = parseParams(accountParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateAccountSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateAccount(deps, auth.value, p.value.accountId, input.value);
      if (!result.ok) return fail(set, ACCOUNT_ERRORS[result.error]);
      return result.value;
    },
  );
