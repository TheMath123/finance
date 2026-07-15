import { Elysia } from "elysia";
import { payInvoice } from "../../../../application/use-cases/card";
import type { AppDeps } from "../../../deps";
import { fail, respond } from "../../../http-error";
import { requireWorkspaceRole } from "../../../guards";
import { validateBody, validateParams } from "../../../validate";
import { invoiceParamsSchema, payInvoiceSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";

export const payInvoiceRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/invoices/:invoiceId/pay",
    async ({ request, params, body, set }) => {
      const p = validateParams(invoiceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(payInvoiceSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await payInvoice(deps, auth.value, p.value.invoiceId, input.value);
      return respond(set, result, CARD_ERRORS);
    },
  );
