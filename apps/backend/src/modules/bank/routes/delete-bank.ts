import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { bankParamsSchema } from "../schemas";
import { BANK_ERRORS } from "../errors";
import { deleteBank } from "../services/delete-bank";

export const deleteBankRoute = (deps: AppDeps) =>
  new Elysia().delete(
    "/workspaces/:workspaceId/banks/:bankId",
    async ({ request, params, set }) => {
      const p = parseParams(bankParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteBank(deps, auth.value, p.value.bankId);
      if (!result.ok) return fail(set, BANK_ERRORS[result.error]);
      set.status = 204;
    },
  );
