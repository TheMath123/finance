import { Elysia } from 'elysia';
import { isFeatureEnabled } from '../../../../application/services/feature-flags';
import {
  MAX_CSV_IMPORT_SIZE_BYTES,
  previewInvoiceCsvImport,
} from '../../../../application/use-cases/card';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { CARD_ERRORS } from '../errors';
import { cardParamsSchema, csvImportPreviewFieldsSchema } from '../schemas';

/** Folga sobre o limite real do arquivo pra cobrir boundary/headers do multipart em si. */
const MAX_REQUEST_BODY_BYTES = MAX_CSV_IMPORT_SIZE_BYTES + 64 * 1024;

export const previewInvoiceCsvImportRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/cards/:cardId/csv-import/preview',
    async ({ request, params, set }) => {
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

      // Rejeita pelo Content-Length ANTES de consumir o stream (mesma auditoria
      // de segurança do upload de anexo — sem isso o corpo inteiro ia pra
      // memória antes do limite ser checado dentro da use-case).
      const contentLength = Number(
        request.headers.get('content-length') ?? '0'
      );
      if (contentLength > MAX_REQUEST_BODY_BYTES) {
        return fail(set, CARD_ERRORS.file_too_large);
      }

      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return fail(set, {
          status: 400,
          code: 'validation_error',
          message: 'Arquivo não enviado.',
        });
      }
      const fields = validateBody(csvImportPreviewFieldsSchema, {
        month: formData.get('month'),
        year: formData.get('year'),
      });
      if (!fields.ok) return fail(set, fields.error);

      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await previewInvoiceCsvImport(deps, auth.value, {
        cardId: p.value.cardId,
        month: fields.value.month,
        year: fields.value.year,
        buffer,
      });
      return respond(set, result, CARD_ERRORS);
    }
  );
