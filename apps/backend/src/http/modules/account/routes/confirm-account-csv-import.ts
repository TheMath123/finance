import { Elysia } from 'elysia';
import { isFeatureEnabled } from '../../../../application/services/feature-flags';
import { confirmAccountCsvImport } from '../../../../application/use-cases/account';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { ACCOUNT_ERRORS } from '../errors';
import { accountParamsSchema, confirmAccountCsvImportSchema } from '../schemas';

export const confirmAccountCsvImportRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/accounts/:accountId/csv-import/confirm',
    async ({ request, params, body, set }) => {
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

      const input = validateBody(confirmAccountCsvImportSchema, body);
      if (!input.ok) return fail(set, input.error);

      const result = await confirmAccountCsvImport(deps, auth.value, {
        accountId: p.value.accountId,
        method: input.value.method,
        rows: input.value.rows,
      });
      return respond(set, result, ACCOUNT_ERRORS);
    }
  );
