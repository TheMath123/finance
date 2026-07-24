import { Elysia } from 'elysia';
import { archiveBank } from '../../../../application/use-cases/bank';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { BANK_ERRORS } from '../errors';
import { bankParamsSchema } from '../schemas';

export const archiveBankRoute = (deps: AppDeps) =>
  new Elysia()
    .post(
      '/workspaces/:workspaceId/banks/:bankId/archive',
      async ({ request, params, set }) => {
        const p = validateParams(bankParamsSchema, params);
        if (!p.ok) return fail(set, p.error);
        const auth = await requireWorkspaceRole(
          deps,
          request,
          p.value.workspaceId,
          'admin'
        );
        if (!auth.ok) return fail(set, auth.error);
        const result = await archiveBank(
          deps,
          auth.value,
          p.value.bankId,
          true
        );
        return respond(set, result, BANK_ERRORS);
      }
    )
    .post(
      '/workspaces/:workspaceId/banks/:bankId/unarchive',
      async ({ request, params, set }) => {
        const p = validateParams(bankParamsSchema, params);
        if (!p.ok) return fail(set, p.error);
        const auth = await requireWorkspaceRole(
          deps,
          request,
          p.value.workspaceId,
          'admin'
        );
        if (!auth.ok) return fail(set, auth.error);
        const result = await archiveBank(
          deps,
          auth.value,
          p.value.bankId,
          false
        );
        return respond(set, result, BANK_ERRORS);
      }
    );
