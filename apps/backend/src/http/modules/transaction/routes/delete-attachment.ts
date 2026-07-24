import { Elysia } from 'elysia';
import { deleteAttachment } from '../../../../application/use-cases/attachment';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { ATTACHMENT_ERRORS } from '../errors';
import { transactionParamsSchema } from '../schemas';

export const deleteAttachmentRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/workspaces/:workspaceId/transactions/:transactionId/attachment',
    async ({ request, params, set }) => {
      const p = validateParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteAttachment(
        deps,
        auth.value,
        p.value.transactionId
      );
      return respond(set, result, ATTACHMENT_ERRORS, 204);
    }
  );
