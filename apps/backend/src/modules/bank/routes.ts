import { Elysia } from "elysia";
import { z } from "zod";
import type { Db } from "@finance/db";
import { fail, parse, requireRole, type HttpError } from "../../lib/http";
import * as bankService from "./service";
import type { BankError } from "./service";

const createSchema = z.object({ name: z.string().min(1).max(80), bankCode: z.string().min(1) });
const updateSchema = createSchema.partial();

const ERRORS: Record<BankError, HttpError> = {
  bank_not_found: { status: 404, code: "bank_not_found", message: "Banco não encontrado." },
  invalid_bank_code: {
    status: 400,
    code: "invalid_bank_code",
    message: "Código de banco fora do catálogo.",
  },
  bank_in_use: {
    status: 409,
    code: "bank_in_use",
    message: "Banco com contas/cartões não pode ser excluído — arquive.",
  },
};

export function bankRoutes(deps: { db: Db; jwtSecret: string }) {
  return new Elysia({ prefix: "/workspaces/:workspaceId/banks" })
    .get("/", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      return bankService.listBanks(deps, auth.value);
    })
    .post("/", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await bankService.createBank(deps, auth.value, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 201;
      return result.value;
    })
    .patch("/:bankId", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await bankService.updateBank(deps, auth.value, params.bankId, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .post("/:bankId/archive", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await bankService.archiveBank(deps, auth.value, params.bankId, true);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .post("/:bankId/unarchive", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await bankService.archiveBank(deps, auth.value, params.bankId, false);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .delete("/:bankId", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await bankService.deleteBank(deps, auth.value, params.bankId);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 204;
    });
}
