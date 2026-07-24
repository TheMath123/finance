import { Elysia } from 'elysia';
import { createCard } from '../../../../application/use-cases/card';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { CARD_ERRORS } from '../errors';
import { createCardSchema, workspaceParamsSchema } from '../schemas';

export const createCardRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/cards',
    async ({ request, params, body, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(createCardSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createCard(deps, auth.value, input.value);
      return respond(set, result, CARD_ERRORS, 201);
    }
  );
