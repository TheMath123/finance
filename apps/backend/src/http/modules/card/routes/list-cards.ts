import { Elysia } from 'elysia';
import { listCards } from '../../../../application/use-cases/card';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail } from '../../../http-error';
import { validateParams } from '../../../validate';
import { workspaceParamsSchema } from '../schemas';

export const listCardsRoute = (deps: AppDeps) =>
  new Elysia().get(
    '/workspaces/:workspaceId/cards',
    async ({ request, params, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'viewer'
      );
      if (!auth.ok) return fail(set, auth.error);
      return listCards(deps, auth.value);
    }
  );
