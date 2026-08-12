import { Elysia } from 'elysia';
import { undoInvoicePayment } from '../../../../application/use-cases/card';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { CARD_ERRORS } from '../errors';
import { invoiceParamsSchema } from '../schemas';

/** Gate mais restrito ('admin') que o de pagar ('member') — reverter um fechamento financeiro pede mais confiança. */
export const undoInvoicePaymentRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/invoices/:invoiceId/undo-payment',
    async ({ request, params, set }) => {
      const p = validateParams(invoiceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);
      const result = await undoInvoicePayment(
        deps,
        auth.value,
        p.value.invoiceId
      );
      return respond(set, result, CARD_ERRORS);
    }
  );
