import { Elysia } from 'elysia';
import { updateCard } from '../../../../application/use-cases/card';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { CARD_ERRORS } from '../errors';
import { cardParamsSchema, updateCardSchema } from '../schemas';

export const updateCardRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/workspaces/:workspaceId/cards/:cardId',
    async ({ request, params, body, set }) => {
      const p = validateParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updateCardSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateCard(
        deps,
        auth.value,
        p.value.cardId,
        input.value
      );
      return respond(set, result, CARD_ERRORS);
    }
  );
