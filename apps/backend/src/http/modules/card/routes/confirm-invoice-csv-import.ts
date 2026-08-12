import { Elysia } from 'elysia';
import { isFeatureEnabled } from '../../../../application/services/feature-flags';
import { confirmInvoiceCsvImport } from '../../../../application/use-cases/card';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { CARD_ERRORS } from '../errors';
import { cardParamsSchema, confirmInvoiceCsvImportSchema } from '../schemas';

export const confirmInvoiceCsvImportRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/cards/:cardId/csv-import/confirm',
    async ({ request, params, body, set }) => {
      const p = validateParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);

      if (!(await isFeatureEnabled(deps, 'card_invoice_csv_import'))) {
        return fail(set, {
          status: 403,
          code: 'feature_disabled',
          message: 'Import de CSV de fatura ainda não está disponível.',
        });
      }

      const input = validateBody(confirmInvoiceCsvImportSchema, body);
      if (!input.ok) return fail(set, input.error);

      const result = await confirmInvoiceCsvImport(deps, auth.value, {
        cardId: p.value.cardId,
        month: input.value.month,
        year: input.value.year,
        rows: input.value.rows,
      });
      return respond(set, result, CARD_ERRORS);
    }
  );
