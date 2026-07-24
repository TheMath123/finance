import { Elysia } from 'elysia';
import { deleteRecurring } from '../../../../application/use-cases/recurring';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { RECURRING_ERRORS } from '../errors';
import { recurringParamsSchema } from '../schemas';

export const deleteRecurringRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/workspaces/:workspaceId/recurring/:recurringId',
    async ({ request, params, set }) => {
      const p = validateParams(recurringParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteRecurring(
        deps,
        auth.value,
        p.value.recurringId
      );
      return respond(set, result, RECURRING_ERRORS, 204);
    }
  );
