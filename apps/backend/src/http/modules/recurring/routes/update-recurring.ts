import { Elysia } from 'elysia';
import { updateRecurring } from '../../../../application/use-cases/recurring';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { RECURRING_ERRORS } from '../errors';
import { recurringParamsSchema, updateRecurringSchema } from '../schemas';

export const updateRecurringRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/workspaces/:workspaceId/recurring/:recurringId',
    async ({ request, params, body, set }) => {
      const p = validateParams(recurringParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateRecurringSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateRecurring(
        deps,
        auth.value,
        p.value.recurringId,
        input.value
      );
      return respond(set, result, RECURRING_ERRORS);
    }
  );
