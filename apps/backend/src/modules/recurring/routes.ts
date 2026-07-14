import { Elysia } from "elysia";
import { z } from "zod";
import type { Db } from "@finance/db";
import { RECURRENCE_FREQUENCIES, TRANSACTION_TYPES } from "@finance/shared";
import { fail, parse, requireRole, type HttpError } from "../../lib/http";
import * as recurringService from "./service";
import type { RecurringError } from "./service";

const createSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  type: z.enum(TRANSACTION_TYPES),
  method: z.enum(["pix", "debit", "cash", "credit"]),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  dayOfReference: z.number().int().min(0).max(31),
  monthOfReference: z.number().int().min(1).max(12).optional(),
  active: z.boolean().optional(),
});
const updateSchema = createSchema.partial();

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const confirmSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const ERRORS: Record<RecurringError, HttpError> = {
  recurring_not_found: {
    status: 404,
    code: "recurring_not_found",
    message: "Recorrência não encontrada.",
  },
  category_not_found: {
    status: 404,
    code: "category_not_found",
    message: "Categoria não encontrada.",
  },
  account_not_found: { status: 404, code: "account_not_found", message: "Conta não encontrada." },
  card_not_found: { status: 404, code: "card_not_found", message: "Cartão não encontrado." },
  invalid_method_fields: {
    status: 400,
    code: "invalid_method_fields",
    message: "Campos incompatíveis com o método (conta/cartão).",
  },
  invalid_rule: {
    status: 400,
    code: "invalid_rule",
    message: "Regra de recorrência inválida (dia/mês incompatíveis com a frequência).",
  },
  occurrence_already_confirmed: {
    status: 409,
    code: "occurrence_already_confirmed",
    message: "Esta ocorrência já foi lançada.",
  },
  not_an_occurrence: {
    status: 400,
    code: "not_an_occurrence",
    message: "A data não é uma ocorrência desta recorrência.",
  },
  transaction_not_found: {
    status: 404,
    code: "transaction_not_found",
    message: "Transação não encontrada.",
  },
  invoice_paid: {
    status: 409,
    code: "invoice_paid",
    message: "Fatura paga é imutável.",
  },
  installment_field_locked: {
    status: 409,
    code: "installment_field_locked",
    message: "Campos de parcela travados.",
  },
};

export function recurringRoutes(deps: { db: Db; jwtSecret: string }) {
  return new Elysia({ prefix: "/workspaces/:workspaceId/recurring" })
    .get("/", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      return recurringService.listRecurring(deps, auth.value);
    })
    .get("/pending", async ({ request, params, query, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const q = parse(monthQuerySchema, query);
      if (!q.ok) return fail(set, q.error);
      return recurringService.listPendingOccurrences(deps, auth.value, q.value.year, q.value.month);
    })
    .post("/", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(createSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await recurringService.createRecurring(deps, auth.value, input.value);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 201;
      return result.value;
    })
    .patch("/:recurringId", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(updateSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await recurringService.updateRecurring(
        deps,
        auth.value,
        params.recurringId,
        input.value,
      );
      if (!result.ok) return fail(set, ERRORS[result.error]);
      return result.value;
    })
    .delete("/:recurringId", async ({ request, params, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const result = await recurringService.deleteRecurring(deps, auth.value, params.recurringId);
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 204;
    })
    .post("/:recurringId/confirm", async ({ request, params, body, set }) => {
      const auth = await requireRole(deps, request, params.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(confirmSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await recurringService.confirmOccurrence(
        deps,
        auth.value,
        params.recurringId,
        input.value.date,
      );
      if (!result.ok) return fail(set, ERRORS[result.error]);
      set.status = 201;
      return result.value;
    });
}
