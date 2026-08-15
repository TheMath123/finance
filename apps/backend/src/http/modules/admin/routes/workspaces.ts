import { Elysia } from 'elysia';
import {
  confirmWorkspacePayment,
  listWorkspaces,
  setWorkspacePlan,
} from '../../../../application/use-cases/admin';
import type { AppDeps } from '../../../deps';
import { requireSuperadmin } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams, validateQuery } from '../../../validate';
import { ADMIN_ERRORS } from '../errors';
import {
  listWorkspacesQuerySchema,
  setWorkspacePlanSchema,
  workspaceParamsSchema,
} from '../schemas';

export const listWorkspacesRoute = (deps: AppDeps) =>
  new Elysia().get('/admin/workspaces', async ({ request, query, set }) => {
    const auth = await requireSuperadmin(deps, request);
    if (!auth.ok) return fail(set, auth.error);
    const filters = validateQuery(listWorkspacesQuerySchema, query);
    if (!filters.ok) return fail(set, filters.error);
    return listWorkspaces(deps, filters.value);
  });

export const setWorkspacePlanRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/admin/workspaces/:workspaceId/plan',
    async ({ request, params, body, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const input = validateBody(setWorkspacePlanSchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await setWorkspacePlan(
        deps,
        auth.value.userId,
        p.value.workspaceId,
        input.value.planId,
        input.value.planPriceId
      );
      return respond(set, result, ADMIN_ERRORS, 200);
    }
  );

export const confirmWorkspacePaymentRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/admin/workspaces/:workspaceId/confirm-payment',
    async ({ request, params, set }) => {
      const p = validateParams(workspaceParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireSuperadmin(deps, request);
      if (!auth.ok) return fail(set, auth.error);
      const result = await confirmWorkspacePayment(
        deps,
        auth.value.userId,
        p.value.workspaceId
      );
      return respond(set, result, ADMIN_ERRORS, 200);
    }
  );
