import { Elysia } from 'elysia';
import { confirmShareReimbursement } from '../../../../application/use-cases/split';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { SPLIT_ERRORS } from '../errors';
import { shareParamsSchema } from '../schemas';

export const confirmShareRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/split-shares/:id/confirm',
    async ({ request, params, set }) => {
      const p = validateParams(shareParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireAuthenticated(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await confirmShareReimbursement(
        deps,
        auth.value,
        p.value.id
      );
      return respond(set, result, SPLIT_ERRORS);
    }
  );
