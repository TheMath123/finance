import { Elysia } from 'elysia';
import { getAttachmentUrl } from '../../../../application/use-cases/attachment';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { ATTACHMENT_ERRORS } from '../errors';
import { transactionParamsSchema } from '../schemas';

export const getAttachmentRoute = (deps: AppDeps) =>
  new Elysia().get(
    '/workspaces/:workspaceId/transactions/:transactionId/attachment',
    async ({ request, params, set }) => {
      const p = validateParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'viewer'
      );
      if (!auth.ok) return fail(set, auth.error);
      const result = await getAttachmentUrl(
        deps,
        auth.value,
        p.value.transactionId
      );
      return respond(set, result, ATTACHMENT_ERRORS);
    }
  );
