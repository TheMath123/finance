import { Elysia } from 'elysia';
import { createCategory } from '../../../../application/use-cases/category';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { CATEGORY_ERRORS } from '../errors';
import { createCategorySchema, workspaceParamsSchema } from '../schemas';

export const createCategoryRoute = (deps: AppDeps) =>
  new Elysia().post(
    '/workspaces/:workspaceId/categories',
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
      const input = validateBody(createCategorySchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await createCategory(deps, auth.value, input.value);
      return respond(set, result, CATEGORY_ERRORS, 201);
    }
  );
