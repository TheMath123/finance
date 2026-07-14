import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { createAccountSchema, workspaceParamsSchema } from "../schemas";
import { ACCOUNT_ERRORS } from "../errors";
import { createAccount } from "../services/create-account";

export const createAccountRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/accounts",
    async ({ request, params, body, set }) => {
      const p = parseParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createAccountSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createAccount(deps, auth.value, input.value);
      if (!result.ok) return fail(set, ACCOUNT_ERRORS[result.error]);
      set.status = 201;
      return result.value;
    },
  );
