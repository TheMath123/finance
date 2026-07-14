import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { createBankSchema, workspaceParamsSchema } from "../schemas";
import { BANK_ERRORS } from "../errors";
import { createBank } from "../services/create-bank";

export const createBankRoute = (deps: AppDeps) =>
  new Elysia().post("/workspaces/:workspaceId/banks", async ({ request, params, body, set }) => {
    const p = parseParams(workspaceParamsSchema, params);
    if (!p.ok) return fail(set, p.error);
    const auth = await requireRole(deps, request, p.value.workspaceId, "admin");
    if (!auth.ok) return fail(set, auth.error);
    const input = parse(createBankSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await createBank(deps, auth.value, input.value);
    if (!result.ok) return fail(set, BANK_ERRORS[result.error]);
    set.status = 201;
    return result.value;
  });
