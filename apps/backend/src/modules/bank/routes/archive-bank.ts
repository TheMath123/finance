import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { bankParamsSchema } from "../schemas";
import { BANK_ERRORS } from "../errors";
import { archiveBank } from "../services/archive-bank";

export const archiveBankRoute = (deps: AppDeps) =>
  new Elysia()
    .post("/workspaces/:workspaceId/banks/:bankId/archive", async ({ request, params, set }) => {
      const p = parseParams(bankParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await archiveBank(deps, auth.value, p.value.bankId, true);
      if (!result.ok) return fail(set, BANK_ERRORS[result.error]);
      return result.value;
    })
    .post("/workspaces/:workspaceId/banks/:bankId/unarchive", async ({ request, params, set }) => {
      const p = parseParams(bankParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await archiveBank(deps, auth.value, p.value.bankId, false);
      if (!result.ok) return fail(set, BANK_ERRORS[result.error]);
      return result.value;
    });
