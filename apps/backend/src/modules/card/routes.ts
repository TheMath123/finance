import { Elysia } from "elysia";
import { z } from "zod";
import type { Db } from "@finance/db";
import { fail, parse, requireRole, type HttpError } from "../../lib/http";
import * as cardService from "./service";
import type { CardError } from "./service";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  bankId: z.string().uuid(),
  limit: z.number().int().positive(),
  closingDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
});
const updateSchema = createSchema.partial();

const paySchema = z.object({
  accountId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["pix", "debit"]),
});

const ERRORS: Record<CardError, HttpError> = {
  bank_not_found: { status: 404, code: "bank_not_found", message: "Banco não encontrado." },
  card_not_found: { status: 404, code: "card_not_found", message: "Cartão não encontrado." },
  card_has_transactions: {
    status: 409,
    code: "card_has_transactions",
    message: "Cartão com transações não pode ser excluído — arquive.",
  },
  invoice_not_found: { status: 404, code: "invoice_not_found", message: "Fatura não encontrada." },
  invoice_already_paid: {
    status: 409,
    code: "invoice_already_paid",
    message: "Fatura já está paga.",
  },
  invoice_empty: { status: 409, code: "invoice_empty", message: "Fatura sem valor a pagar." },
  account_not_found: { status: 404, code: "account_not_found", message: "Conta não encontrada." },
};

export function cardRoutes(deps: { db: Db; jwtSecret: string }) {
  return new Elysia({ prefix: "/workspaces/:workspaceId" })
    .get("/cards", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      return cardService.listCards(deps, auth.value);
    })
    .post("/cards", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await cardService.createCard(deps, auth.value, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 201;
      return result.value;
    })
    .patch("/cards/:cardId", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await cardService.updateCard(deps, auth.value, params.cardId, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .post("/cards/:cardId/archive", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await cardService.archiveCard(deps, auth.value, params.cardId, true);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .post("/cards/:cardId/unarchive", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await cardService.archiveCard(deps, auth.value, params.cardId, false);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .delete("/cards/:cardId", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "admin");
      if (!auth.ok) return fail(set, auth.error);
      const result = await cardService.deleteCard(deps, auth.value, params.cardId);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 204;
    })
    .get("/cards/:cardId/invoices", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const result = await cardService.listInvoices(deps, auth.value, params.cardId);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .post("/invoices/:invoiceId/pay", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(paySchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await cardService.payInvoice(deps, auth.value, params.invoiceId, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    });
}
