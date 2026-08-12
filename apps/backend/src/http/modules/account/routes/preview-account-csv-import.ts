import { Elysia } from 'elysia';
import { isFeatureEnabled } from '../../../../application/services/feature-flags';
import {
  MAX_CSV_IMPORT_SIZE_BYTES,
  previewAccountCsvImport,
} from '../../../../application/use-cases/account';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { ACCOUNT_ERRORS } from '../errors';
import { accountParamsSchema } from '../schemas';

/** Folga sobre o limite real do arquivo pra cobrir boundary/headers do multipart em si. */
const MAX_REQUEST_BODY_BYTES = MAX_CSV_IMPORT_SIZE_BYTES + 64 * 1024;

export const previewAccountCsvImportRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/accounts/:accountId/csv-import/preview',
    async ({ request, params, set }) => {
      const p = validateParams(accountParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);

      if (!(await isFeatureEnabled(deps, 'account_csv_import'))) {
        return fail(set, {
          status: 403,
          code: 'feature_disabled',
          message: 'Import de CSV de conta ainda não está disponível.',
        });
      }

      // Rejeita pelo Content-Length ANTES de consumir o stream (mesma auditoria
      // de segurança do import de fatura de cartão).
      const contentLength = Number(
        request.headers.get('content-length') ?? '0'
      );
      if (contentLength > MAX_REQUEST_BODY_BYTES) {
        return fail(set, ACCOUNT_ERRORS.file_too_large);
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

      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await previewAccountCsvImport(deps, auth.value, {
        accountId: p.value.accountId,
        buffer,
      });
      return respond(set, result, ACCOUNT_ERRORS);
    }
  );
