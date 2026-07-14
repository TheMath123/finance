import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { bankParamsSchema, updateBankSchema } from "../schemas";
import { BANK_ERRORS } from "../errors";
import { updateBank } from "../services/update-bank";

export const updateBankRoute = (deps: AppDeps) =>
  new Elysia().patch(
    "/workspaces/:workspaceId/banks/:bankId",
    async ({ request, params, body, set }) => {
      const p = parseParams(bankParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateBankSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateBank(deps, auth.value, p.value.bankId, input.value);
      if (!result.ok) return fail(set, BANK_ERRORS[result.error]);
      return result.value;
    },
  );
