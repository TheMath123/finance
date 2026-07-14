import { Elysia } from "elysia";
import type { AppDeps } from "../../../lib/deps";
import { fail, parse, parseParams, requireRole } from "../../../lib/http";
import { invoiceParamsSchema, payInvoiceSchema } from "../schemas";
import { CARD_ERRORS } from "../errors";
import { payInvoice } from "../services/pay-invoice";

export const payInvoiceRoute = (deps: AppDeps) =>
  new Elysia().post(
    "/workspaces/:workspaceId/invoices/:invoiceId/pay",
    async ({ request, params, body, set }) => {
      const p = parseParams(invoiceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireRole(deps, request, p.value.workspaceId, "member");
      if (!auth.ok) return fail(set, auth.error);
      const input = parse(payInvoiceSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await payInvoice(deps, auth.value, p.value.invoiceId, input.value);
      if (!result.ok) return fail(set, CARD_ERRORS[result.error]);
      return result.value;
    },
  );
