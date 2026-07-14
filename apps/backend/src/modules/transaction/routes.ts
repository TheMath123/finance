import { Elysia } from "elysia";
import { z } from "zod";
import type { Db } from "@finance/db";
import { TRANSACTION_METHODS, TRANSACTION_TYPES } from "@finance/shared";
import { fail, parse, requireRole, type HttpError } from "../../lib/http";
import * as transactionService from "./service";
import type { TransactionError } from "./service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato YYYY-MM-DD");

const createSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  type: z.enum(TRANSACTION_TYPES),
  method: z.enum(TRANSACTION_METHODS),
  date: dateSchema,
  categoryId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  installments: z.number().int().min(1).max(48).optional(),
});

const updateSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amount: z.number().int().positive().optional(),
  categoryId: z.string().uuid().optional(),
  date: dateSchema.optional(),
});

const listSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ERRORS: Record<TransactionError, HttpError> = {
  category_not_found: {
    status: 404,
    code: "category_not_found",
    message: "Categoria não encontrada.",
  },
  account_not_found: { status: 404, code: "account_not_found", message: "Conta não encontrada." },
  card_not_found: { status: 404, code: "card_not_found", message: "Cartão não encontrado." },
  transaction_not_found: {
    status: 404,
    code: "transaction_not_found",
    message: "Transação não encontrada.",
  },
  invalid_method_fields: {
    status: 400,
    code: "invalid_method_fields",
    message: "Campos incompatíveis com o método (conta/cartão/destino).",
  },
  invoice_paid: {
    status: 409,
    code: "invoice_paid",
    message: "Fatura paga é imutável — faça um estorno.",
  },
  installment_field_locked: {
    status: 409,
    code: "installment_field_locked",
    message: "Valor e data de parcela são travados; edite descrição/categoria.",
  },
};

export function transactionRoutes(deps: { db: Db; jwtSecret: string }) {
  return new Elysia({ prefix: "/workspaces/:workspaceId/transactions" })
    .get("/", async ({ request, params, query, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const filters = parse(listSchema, query);
      if (!filters.ok) return fail(set, filters.error);
      return transactionService.listTransactions(deps, auth.value, filters.value);
    })
    .post("/", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await transactionService.createTransaction(deps, auth.value, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 201;
      return result.value;
    })
    .patch("/:transactionId", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await transactionService.updateTransaction(
        deps,
        auth.value,
        params.transactionId,
        input.value,
      );
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .delete("/:transactionId", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const result = await transactionService.deleteTransaction(
        deps,
        auth.value,
        params.transactionId,
      );
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .post("/:transactionId/restore", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const result = await transactionService.restoreTransaction(
        deps,
        auth.value,
        params.transactionId,
      );
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    });
}
