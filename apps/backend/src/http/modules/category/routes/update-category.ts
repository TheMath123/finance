import { Elysia } from 'elysia';
import { isFeatureEnabled } from '../../../../application/services/feature-flags';
import { updateCategory } from '../../../../application/use-cases/category';
import type { AppDeps } from '../../../deps';
import { requireWorkspaceRole } from '../../../guards';
import { fail, respond } from '../../../http-error';
import { validateBody, validateParams } from '../../../validate';
import { CATEGORY_ERRORS } from '../errors';
import { categoryParamsSchema, updateCategorySchema } from '../schemas';

export const updateCategoryRoute = (deps: AppDeps) =>
  new Elysia().patch(
    '/workspaces/:workspaceId/categories/:categoryId',
    async ({ request, params, body, set }) => {
      const p = validateParams(categoryParamsSchema, params);
      if (!p.ok) return fail(set, p.error);
      const auth = await requireWorkspaceRole(
        deps,
        request,
        p.value.workspaceId,
        'admin'
      );
      if (!auth.ok) return fail(set, auth.error);

      if (!(await isFeatureEnabled(deps, 'custom_category_creation'))) {
        return fail(set, {
          status: 403,
          code: 'feature_disabled',
          message: 'Editar categoria própria ainda não está disponível.',
        });
      }

      const input = validateBody(updateCategorySchema, body);
      if (!input.ok) return fail(set, input.error);
      const result = await updateCategory(
        deps,
        auth.value,
        p.value.categoryId,
        input.value
      );
      return respond(set, result, CATEGORY_ERRORS);
    }
  );
