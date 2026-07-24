import { Elysia } from 'elysia';
import { deleteCard } from '../../../../application/use-cases/card';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateParams } from '../../../validate';
import { CARD_ERRORS } from '../errors';
import { cardParamsSchema } from '../schemas';

export const deleteCardRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/workspaces/:workspaceId/cards/:cardId',
    async ({ request, params, set }) => {
      const p = validateParams(cardParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteCard(deps, auth.value, p.value.cardId);
      return respond(set, result, CARD_ERRORS, 204);
    }
  );
