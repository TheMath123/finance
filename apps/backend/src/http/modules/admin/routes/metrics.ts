import { Elysia } from 'elysia';
import { getPlatformMetrics } from '../../../../application/use-cases/admin';
import type { AppDeps } from '../../../deps';
import { requireSuperadmin } from '../../../guards';
import { fail } from '../../../http-error';

export const getPlatformMetricsRoute = (deps: AppDeps) =>
  new Elysia().get('/admin/metrics', async ({ request, set }) => {
    const auth = await requireSuperadmin(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return getPlatformMetrics(deps);
  });
