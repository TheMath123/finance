import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parseParams, requireRole } from "../../../lib/http";
import { cardParamsSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";
import { listInvoices } from "../services/list-invoices";

export const listInvoicesRoute = (deps: AppDeps) =>
  new Elysia().get(
    "/workspaces/:workspaceId/cards/:cardId/invoices",
    async ({ request, params, set }) => {
      const p = parseParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const result = await listInvoices(deps, auth.value, p.value.cardId);
      if (!result.ok) return fail(set, CARD_ERRORS[result.error]);
      return result.value;
    },
  );
