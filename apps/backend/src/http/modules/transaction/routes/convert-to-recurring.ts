import { Elysia } from 'elysia';
import { convertToRecurring } from '../../../../application/use-cases/recurring';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { RECURRING_ERRORS } from '../../recurring/errors';
import { convertToRecurringSchema, transactionParamsSchema } from '../schemas';

export const convertToRecurringRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/transactions/:transactionId/convert-to-recurring',
    async ({ request, params, body, set }) => {
      const p = validateParams(transactionParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'member'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(convertToRecurringSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await convertToRecurring(deps, auth.value, {
        transactionId: p.value.transactionId,
        frequency: input.value.frequency,
        dayOfReference: input.value.dayOfReference,
        monthOfReference: input.value.monthOfReference,
      });
      return respond(set, result, RECURRING_ERRORS);
    }
  );
