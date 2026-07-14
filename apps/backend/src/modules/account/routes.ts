import { Elysia } from "elysia";
import { z } from "zod";
import type { Db } from "@finance/db";
import { ACCOUNT_TYPES } from "@finance/shared";
import { fail, parse, requireRole, type HttpError } from "../../lib/http";
import * as accountService from "./service";
import type { AccountError } from "./service";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  bankId: z.string().uuid(),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number().int().default(0),
});
const updateSchema = createSchema.partial();

const ERRORS: Record<AccountError, HttpError> = {
  bank_not_found: { status: 404, code: "bank_not_found", message: "Banco não encontrado." },
  account_not_found: { status: 404, code: "account_not_found", message: "Conta não encontrada." },
  account_has_transactions: {
    status: 409,
    code: "account_has_transactions",
    message: "Conta com transações não pode ser excluída — arquive.",
  },
};

export function accountRoutes(deps: { db: Db; jwtSecret: string }) {
  return new Elysia({ prefix: "/workspaces/:workspaceId/accounts" })
    .get("/", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      return accountService.listAccounts(deps, auth.value);
    })
    .post("/", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await accountService.createAccount(deps, auth.value, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 201;
      return result.value;
    })
    .patch("/:accountId", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await accountService.updateAccount(
        deps,
        auth.value,
        params.accountId,
        input.value,
      );
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .post("/:accountId/archive", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await accountService.archiveAccount(deps, auth.value, params.accountId, true);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .post("/:accountId/unarchive", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await accountService.archiveAccount(
        deps,
        auth.value,
        params.accountId,
        false,
      );
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .delete("/:accountId", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await accountService.deleteAccount(deps, auth.value, params.accountId);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 204;
    });
}
