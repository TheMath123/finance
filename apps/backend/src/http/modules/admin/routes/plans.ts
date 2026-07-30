import { Elysia } from 'elysia';
import {
  activatePlan,
  createPlan,
  deactivatePlan,
  listPlans,
  updatePlan,
} from '../../../../application/use-cases/admin';
import type { AppDeps } from '../../../deps';
import { requireSuperadmin } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { ADMIN_ERRORS } from '../errors';
import {
  createPlanSchema,
  planParamsSchema,
  updatePlanSchema,
} from '../schemas';

export const listPlansRoute = (deps: AppDeps) =>
  new Elysia().get('/admin/plans', async ({ request, set }) => {
    const auth = await requireSuperadmin(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    return listPlans(deps);
  });

export const createPlanRoute = (deps: AppDeps) =>
  new Elysia().post('/admin/plans', async ({ request, body, set }) => {
    const auth = await requireSuperadmin(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const input = validateBody(createPlanSchema, body);
    if (!input.ok) return fail(set, input.error);
    const result = await createPlan(deps, auth.value.userId, input.value);
    return respond(set, result, ADMIN_ERRORS, 201);
  });

export const updatePlanRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/admin/plans/:id',
    async ({ request, params, body, set }) => {
      const p = validateParams(planParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(updatePlanSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updatePlan(
        deps,
        auth.value.userId,
        p.value.id,
        input.value
      );
      return respond(set, result, ADMIN_ERRORS, 200);
    }
  );

export const deactivatePlanRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/admin/plans/:id/deactivate',
    async ({ request, params, set }) => {
      const p = validateParams(planParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await deactivatePlan(deps, auth.value.userId, p.value.id);
      return respond(set, result, ADMIN_ERRORS, 200);
    }
  );

export const activatePlanRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/admin/plans/:id/activate',
    async ({ request, params, set }) => {
      const p = validateParams(planParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await activatePlan(deps, auth.value.userId, p.value.id);
      return respond(set, result, ADMIN_ERRORS, 200);
    }
  );
