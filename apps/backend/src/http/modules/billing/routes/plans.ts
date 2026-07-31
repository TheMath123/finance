import { Elysia } from 'elysia';
import { listAvailablePlans } from '../../../../application/use-cases/billing/list-available-plans';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail } from '../../../http-error';

/** M5-05 — planos disponíveis pra qualquer usuário autenticado (autoatendimento, M5-04), sem gate de superadmin. */
export const listAvailablePlansRoute = (deps: AppDeps) =>
  new Elysia().get('/plans', async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listAvailablePlans(deps);
  });
