import { Elysia } from 'elysia';
import { markSharePaid } from '../../../../application/use-cases/split';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { SPLIT_ERRORS } from '../errors';
import { shareParamsSchema } from '../schemas';

export const markSharePaidRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/split-shares/:id/paid',
    async ({ request, params, set }) => {
      const p = validateParams(shareParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireAuthenticated(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await markSharePaid(deps, auth.value, p.value.id);
      return respond(set, result, SPLIT_ERRORS);
    }
  );
