import { Elysia } from "elysia";
import { listInvoices } from "../../../../application/use-cases/card";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateParams } from "../../../validate";
import { cardParamsSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";

export const listInvoicesRoute = (deps: AppDeps) =>
  new Elysia().get(
    "/workspaces/:workspaceId/cards/:cardId/invoices",
    async ({ request, params, set }) => {
      const p = validateParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "viewer");
      if (!auth.ok) return fail(set, auth.error);
      const result = await listInvoices(deps, auth.value, p.value.cardId);
      return respond(set, result, CARD_ERRORS);
    },
  );
