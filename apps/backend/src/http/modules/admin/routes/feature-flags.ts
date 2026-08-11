import { Elysia } from 'elysia';
import {
  deleteFeatureFlag,
  listFeatureFlags,
  upsertFeatureFlag,
} from '../../../../application/use-cases/admin';
import type { AppDeps } from '../../../deps';
import { requireSuperadmin } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { ADMIN_ERRORS } from '../errors';
import { featureFlagParamsSchema, upsertFeatureFlagSchema } from '../schemas';

export const listFeatureFlagsRoute = (deps: AppDeps) =>
  new Elysia().get('/admin/feature-flags', async ({ request, set }) => {
    const auth = await requireSuperadmin(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listFeatureFlags(deps);
  });

export const upsertFeatureFlagRoute = (deps: AppDeps) =>
  new Elysia().put(
    '/admin/feature-flags/:key',
    async ({ request, params, body, set }) => {
      const p = validateParams(featureFlagParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(upsertFeatureFlagSchema, body);
      if (!input.ok) return fail(set, input.error);
      return upsertFeatureFlag(
        deps,
        auth.value.userId,
        p.value.key,
        input.value
      );
    }
  );

export const deleteFeatureFlagRoute = (deps: AppDeps) =>
  new Elysia().delete(
    '/admin/feature-flags/:key',
    async ({ request, params, set }) => {
      const p = validateParams(featureFlagParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await deleteFeatureFlag(
        deps,
        auth.value.userId,
        p.value.key
      );
      return respond(set, result, ADMIN_ERRORS, 204);
    }
  );
